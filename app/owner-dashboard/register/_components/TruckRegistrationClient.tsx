'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSafeAuth } from '@/lib/auth/useSafeAuth';
import { useTruckRegistrationForm } from '../_components/useTruckRegistrationForm';
import { TruckForm, TruckFormLayout, SubmitActions } from '@/components/owner/TruckFormSections';
import { FacebookPageSelector } from '@/components/owner/FacebookPageSelector';
import { Separator } from '@/components/ui/separator';

export default function RegisterClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useSafeAuth();
  const { loading, formData, setFormData, handleSubmit, handleCuisineChange, handleHoursChange } =
    useTruckRegistrationForm(user?.id);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/?auth=open');
    }
  }, [user, authLoading, router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <TruckFormLayout
      title="Register Your Food Truck"
      description="Add your food truck to help customers find you"
      submitActions={
        <SubmitActions
          loading={loading}
          onCancel={() => router.back()}
          submitText="Register Truck"
          cancelText="Cancel"
        />
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <TruckForm
          formData={formData}
          setFormData={(unifiedData) =>
            setFormData((prev) => ({
              ...prev,
              name: unifiedData.name ?? prev.name,
              description: unifiedData.description ?? prev.description,
              phone: unifiedData.phone ?? prev.phone,
              email: unifiedData.email ?? prev.email,
              website: unifiedData.website ?? prev.website,
              facebook: unifiedData.facebook ?? prev.facebook,
              instagram: unifiedData.instagram ?? prev.instagram,
              twitter: unifiedData.twitter ?? prev.twitter,
              address: unifiedData.address ?? prev.address,
              city: unifiedData.city ?? prev.city,
              state: unifiedData.state ?? prev.state,
              zip: unifiedData.zip ?? prev.zip,
              lat: unifiedData.lat ?? prev.lat,
              lng: unifiedData.lng ?? prev.lng,
              cuisineTypes: unifiedData.cuisineTypes ?? prev.cuisineTypes,
              operatingHours: unifiedData.operatingHours ?? prev.operatingHours,
            }))
          }
          onCuisineChange={handleCuisineChange}
          onHoursChange={handleHoursChange}
        >
          <Separator className="my-6" />
          <FacebookPageSelector
            selectedPageId={
              formData.facebookPageId.length > 0 ? formData.facebookPageId : undefined
            }
            onPageSelect={(pageId, pageName) =>
              setFormData((prev) => ({
                ...prev,
                facebookPageId: pageId,
                facebookPageName: pageName,
              }))
            }
            userId={user?.id}
          />
        </TruckForm>
      </form>
    </TruckFormLayout>
  );
}
