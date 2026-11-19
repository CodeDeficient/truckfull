/**
 * Risk Evaluation Engine
 * WBS: 3.4.4a, 3.4.4b
 *
 * Evaluates updates for risk level and determines if auto-approval is safe.
 */

import { RiskLevel, getRiskLevel, canAutoApprove } from '@/lib/config/riskLevels';
import { checkUpdateAnomalies, AnomalyCheckResult } from '@/lib/ai/anomalyDetection';
import { toUpdateCategory, ClassificationResult } from '@/lib/ai/classifyPost';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logError } from '@/lib/logging';

// Feature flag check - can be overridden by env or DB setting
const ENABLE_AUTO_APPROVAL = process.env.ENABLE_AUTO_APPROVAL !== 'false';

export interface RiskEvaluation {
  riskLevel: RiskLevel;
  reasons: string[];
  canAutoApprove: boolean;
  anomalyDetected: boolean;
  confidence: number;
}

export interface AutoApprovalResult {
  shouldAutoApprove: boolean;
  decision: 'auto_approved' | 'queued_for_review';
  reasons: string[];
  riskEvaluation: RiskEvaluation;
}

/**
 * Evaluates the risk of a proposed update.
 *
 * @param classification - AI classification result
 * @param currentData - Current truck data
 * @param newData - Proposed new data
 * @returns Risk evaluation with level, reasons, and auto-approve eligibility
 */
export function evaluateRisk(
  classification: ClassificationResult,
  currentData: Record<string, unknown>,
  newData: Record<string, unknown>,
): RiskEvaluation {
  const reasons: string[] = [];
  const category = toUpdateCategory(classification.category);
  const baseRiskLevel = getRiskLevel(category);
  let finalRiskLevel = baseRiskLevel;
  let anomalyDetected = false;

  // Check for anomalies
  const anomalyResult: AnomalyCheckResult = checkUpdateAnomalies(
    classification.category,
    currentData,
    newData,
  );

  if (anomalyResult.isAnomaly) {
    anomalyDetected = true;
    reasons.push(...anomalyResult.reasons);
    // Escalate risk level if anomaly detected
    if (anomalyResult.riskLevel === RiskLevel.HIGH) {
      finalRiskLevel = RiskLevel.HIGH;
    }
  }

  // Add base risk reason
  reasons.push(`Update type "${classification.category}" has ${baseRiskLevel} base risk`);

  // Low confidence increases risk
  if (classification.confidence < 0.7) {
    reasons.push(
      `Low AI confidence (${(classification.confidence * 100).toFixed(0)}%) - requires review`,
    );
    if (finalRiskLevel !== RiskLevel.HIGH) {
      finalRiskLevel = RiskLevel.MEDIUM;
    }
  }

  // Determine auto-approval eligibility
  const eligible =
    canAutoApprove(category, classification.confidence) && !anomalyDetected && ENABLE_AUTO_APPROVAL;

  logMessage('Risk evaluation complete:', {
    category,
    riskLevel: finalRiskLevel,
    confidence: classification.confidence,
    anomalyDetected,
    canAutoApprove: eligible,
  });

  return {
    riskLevel: finalRiskLevel,
    reasons,
    canAutoApprove: eligible,
    anomalyDetected,
    confidence: classification.confidence,
  };
}

/**
 * Makes the auto-approval decision and logs it.
 *
 * @param truckId - ID of the truck
 * @param classification - AI classification result
 * @param currentData - Current truck data
 * @param newData - Proposed new data
 * @param sourcePostUrl - Optional URL of the source post
 * @returns Decision result with approval status and reasons
 */
export async function makeAutoApprovalDecision(
  truckId: string,
  classification: ClassificationResult,
  currentData: Record<string, unknown>,
  newData: Record<string, unknown>,
  sourcePostUrl?: string,
): Promise<AutoApprovalResult> {
  const riskEvaluation = evaluateRisk(classification, currentData, newData);
  const shouldAutoApprove = riskEvaluation.canAutoApprove;

  const result: AutoApprovalResult = {
    shouldAutoApprove,
    decision: shouldAutoApprove ? 'auto_approved' : 'queued_for_review',
    reasons: [...riskEvaluation.reasons],
    riskEvaluation,
  };

  const adminClient = getSupabaseAdmin();

  try {
    if (shouldAutoApprove) {
      // Auto-approve: Apply the update directly
      logMessage(`Auto-approving update for truck ${truckId}`);

      const { error: updateError } = await adminClient
        .from('food_trucks')
        .update(newData)
        .eq('id', truckId);

      if (updateError) {
        logError('Failed to apply auto-approved update:', updateError);
        result.shouldAutoApprove = false;
        result.decision = 'queued_for_review';
        result.reasons.push('Auto-approval failed - queued for manual review');
      }

      // Log the auto-approval to audit_log
      await adminClient.from('audit_log').insert({
        action_type: 'auto_approve',
        entity_type: 'food_truck',
        entity_id: truckId,
        user_id: null, // System action
        old_value: currentData as import('@/lib/database.remote.types').Json,
        new_value: newData as import('@/lib/database.remote.types').Json,
        reason: `Auto-approved: ${result.reasons.join('; ')}`,
        metadata: {
          confidence: classification.confidence,
          risk_level: riskEvaluation.riskLevel,
          source_post_url: sourcePostUrl,
        } as import('@/lib/database.remote.types').Json,
      });
    } else {
      // Queue for review: Create pending_updates record
      logMessage(`Queuing update for truck ${truckId} for manual review`);

      const { error: insertError } = await adminClient.from('pending_updates').insert({
        truck_id: truckId,
        category: classification.category,
        old_value: currentData as import('@/lib/database.remote.types').Json,
        new_value: newData as import('@/lib/database.remote.types').Json,
        risk_score: classification.confidence,
        risk_level: riskEvaluation.riskLevel,
        source: sourcePostUrl ?? null,
        status: 'pending',
      });

      if (insertError) {
        logError('Failed to create pending update:', insertError);
        throw new Error('Failed to queue update for review');
      }
    }
  } catch (error) {
    logError('Error in auto-approval decision:', error);
    throw error;
  }

  return result;
}

/**
 * Checks if auto-approval is globally enabled.
 * Can be used by admin UI to show current status.
 */
export function isAutoApprovalEnabled(): boolean {
  return ENABLE_AUTO_APPROVAL;
}
