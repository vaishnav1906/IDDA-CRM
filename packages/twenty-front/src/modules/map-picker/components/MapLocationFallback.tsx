import { useState } from 'react';

import { styled } from '@linaria/react';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { buildMapsUrl } from '@/map-picker/utils/mapLocationUtils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { IconInfoCircle } from 'twenty-ui/icon';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
  background: ${themeCssVariables.background.secondary};
  border-radius: ${themeCssVariables.border.radius.md};
  border: 1px solid ${themeCssVariables.border.color.medium};
`;

const StyledRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  min-width: 80px;
`;

const StyledInput = styled.input`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  width: 160px;
  outline: none;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }
`;

const StyledError = styled.span`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledLink = styled.a`
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.sm};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: ${themeCssVariables.spacing[1]};

  &:hover {
    text-decoration: underline;
  }
`;

const StyledInfoToggle = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${themeCssVariables.font.color.tertiary};
  padding: 0;
  display: inline-flex;
  align-items: center;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledInfoBox = styled.div`
  background: ${themeCssVariables.background.tertiary};
  border-radius: ${themeCssVariables.border.radius.sm};
  padding: ${themeCssVariables.spacing[3]};
  font-size: ${themeCssVariables.font.size.xs};
  color: ${themeCssVariables.font.color.secondary};
  line-height: 1.5;
`;

const StyledWarning = styled.p`
  color: ${themeCssVariables.color.yellow};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

type MapLocationFallbackProps = {
  latitude: string;
  longitude: string;
  errorMessage?: string;
  isReadOnly?: boolean;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
};

export const MapLocationFallback = ({
  latitude,
  longitude,
  errorMessage,
  isReadOnly = false,
  onLatitudeChange,
  onLongitudeChange,
}: MapLocationFallbackProps) => {
  const isMobile = useIsMobile();
  const [showInfo, setShowInfo] = useState(false);

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasValidCoords =
    !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng);
  const mapsUrl = hasValidCoords ? buildMapsUrl(lat, lng) : null;

  const desktopInstructions =
    'Open Google Maps and find the required location. Right-click the exact point on the map. The latitude and longitude will appear at the top of the menu. Click the coordinates to copy them, then paste them into the Latitude and Longitude fields.';

  const mobileInstructions =
    'Open Google Maps and find the required location. Press and hold the exact point to drop a pin. Open the dropped-pin details and copy the latitude and longitude, then paste them into the Latitude and Longitude fields.';

  return (
    <StyledContainer>
      {errorMessage && (
        <StyledWarning>⚠ {errorMessage}</StyledWarning>
      )}

      <StyledRow>
        <StyledLabel>Latitude</StyledLabel>
        <StyledInput
          type="number"
          value={latitude}
          onChange={(e) => onLatitudeChange(e.target.value)}
          placeholder="-90 to 90"
          min={-90}
          max={90}
          step="any"
          readOnly={isReadOnly}
        />
        <StyledInfoToggle
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          title="How to find coordinates"
        >
          <IconInfoCircle size={14} />
        </StyledInfoToggle>
      </StyledRow>

      <StyledRow>
        <StyledLabel>Longitude</StyledLabel>
        <StyledInput
          type="number"
          value={longitude}
          onChange={(e) => onLongitudeChange(e.target.value)}
          placeholder="-180 to 180"
          min={-180}
          max={180}
          step="any"
          readOnly={isReadOnly}
        />
      </StyledRow>

      {showInfo && (
        <StyledInfoBox>
          {isMobile ? mobileInstructions : desktopInstructions}
        </StyledInfoBox>
      )}

      {hasValidCoords && mapsUrl && (
        <StyledLink href={mapsUrl} target="_blank" rel="noopener noreferrer">
          Open Google Maps ↗
        </StyledLink>
      )}

      {!hasValidCoords && latitude && longitude && (
        <StyledError>Both latitude and longitude are required to open the map.</StyledError>
      )}
    </StyledContainer>
  );
};
