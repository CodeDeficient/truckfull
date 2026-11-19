import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { SUBMISSION_ADMIN_QUERY_COLUMNS } from './adminQueryColumns';
import { ListingSubmissionsClient } from './_components/ListingSubmissionsClient';

export const dynamic = 'force-dynamic';

interface SubmissionRow {
  id: string;
  status: string;
  truck_name: string;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  menu_text: string | null;
  notes: string | null;
  logo_path: string | null;
  menu_asset_path: string | null;
  source: string;
  admin_notes: string | null;
  created_at: string;
}

export interface AdminListingSubmission extends SubmissionRow {
  logo_url: string | null;
  menu_asset_url: string | null;
}

const SUBMISSION_BUCKET = 'truck-listing-submissions';

async function buildSignedAssetUrls(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  paths: ReadonlyArray<string>,
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  if (paths.length === 0) {
    return urlMap;
  }
  const { data, error } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrls([...paths], 3600);
  if (error) {
    logError('Failed to sign submission asset URLs', error);
    return urlMap;
  }
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      urlMap.set(item.path, item.signedUrl);
    }
  }
  return urlMap;
}

function mapSubmission(row: SubmissionRow, signedUrls: Map<string, string>): AdminListingSubmission {
  return {
    ...row,
    logo_url: row.logo_path ? (signedUrls.get(row.logo_path) ?? null) : null,
    menu_asset_url: row.menu_asset_path ? (signedUrls.get(row.menu_asset_path) ?? null) : null,
  };
}

export default async function ListingSubmissionsPage() {
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from('truck_listing_submissions')
    .select(SUBMISSION_ADMIN_QUERY_COLUMNS.join(', '))
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);

  if (error) {
    return <ListingSubmissionsClient submissions={[]} loadError={error.message} />;
  }

  const submissionRows = (rows ?? []) as unknown as SubmissionRow[];

  const assetPaths = submissionRows.flatMap((row) =>
    [row.logo_path, row.menu_asset_path].filter((path): path is string => path !== null),
  );
  const signedUrls = await buildSignedAssetUrls(supabase, assetPaths);

  const submissions: AdminListingSubmission[] = submissionRows.map((row) =>
    mapSubmission(row, signedUrls),
  );

  return <ListingSubmissionsClient submissions={submissions} loadError={undefined} />;
}
