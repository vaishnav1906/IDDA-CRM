import { useCallback, useEffect, useState } from 'react';

import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { MapLocationPicker } from '@/map-picker/components/MapLocationPicker';
import { type MapLocationResult } from '@/map-picker/types/mapLocation.types';
import { Button } from 'twenty-ui/input';
import { IconMap } from 'twenty-ui/icon';

type LeadRecord = {
  __typename: string;
  id: string;
  latitude?: number | null;
  longitude?: number | null;
};

type LeadMapPickerButtonProps = {
  objectRecordId: string;
};

export const LeadMapPickerButton = ({
  objectRecordId,
}: LeadMapPickerButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLatitude, setCurrentLatitude] = useState<number | null>(null);
  const [currentLongitude, setCurrentLongitude] = useState<number | null>(null);

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: 'lead',
  });
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { updateOneRecord } = useUpdateOneRecord();

  const canEdit =
    !objectMetadataItem ||
    objectPermissionsByObjectMetadataId[objectMetadataItem.id]
      ?.canUpdateObjectRecords !== false;

  const { findOneRecord } = useLazyFindOneRecord<LeadRecord>({
    objectNameSingular: 'lead',
    recordGqlFields: { id: true, latitude: true, longitude: true },
  });

  // Load existing coordinates when the record ID changes
  useEffect(() => {
    findOneRecord({
      objectRecordId,
      onCompleted: (record) => {
        setCurrentLatitude(record.latitude ?? null);
        setCurrentLongitude(record.longitude ?? null);
      },
    });
  }, [findOneRecord, objectRecordId]);

  const handleConfirm = useCallback(
    async (result: MapLocationResult) => {
      setIsModalOpen(false);

      // Update all six location fields atomically
      await updateOneRecord({
        objectNameSingular: 'lead',
        idToUpdate: objectRecordId,
        updateOneRecordInput: {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address || undefined,
          city: result.city || undefined,
          state: result.state || undefined,
          // LINKS field format: { primaryLinkUrl, primaryLinkLabel, secondaryLinks }
          mapsUrl: result.mapsUrl
            ? {
                primaryLinkUrl: result.mapsUrl,
                primaryLinkLabel: 'View on Map',
                secondaryLinks: [],
              }
            : undefined,
        },
      });

      // Refresh local state with new coordinates
      setCurrentLatitude(result.latitude);
      setCurrentLongitude(result.longitude);
    },
    [objectRecordId, updateOneRecord],
  );

  if (!canEdit) return null;

  return (
    <>
      <Button
        title="Select Location on Map"
        Icon={IconMap}
        variant="secondary"
        size="small"
        onClick={() => setIsModalOpen(true)}
      />

      <MapLocationPicker
        isOpen={isModalOpen}
        initialLatitude={currentLatitude}
        initialLongitude={currentLongitude}
        onConfirm={handleConfirm}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
