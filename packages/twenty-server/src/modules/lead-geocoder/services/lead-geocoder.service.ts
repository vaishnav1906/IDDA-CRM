import { Injectable, Logger } from '@nestjs/common';

import * as https from 'https';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

interface GeocoderResult {
  lat: number;
  lon: number;
}

@Injectable()
export class LeadGeocoderService {
  private readonly logger = new Logger(LeadGeocoderService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async geocodeAndUpdate(
    workspaceId: string,
    leadId: string,
    address: string,
  ): Promise<void> {
    const coords = await this.geocode(address);

    if (!coords) {
      this.logger.debug(
        `LeadGeocoderService: no coords found for lead=${leadId}`,
      );
      return;
    }

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const leadRepo = await this.globalWorkspaceOrmManager.getRepository(
          workspaceId,
          'lead',
          { shouldBypassPermissionChecks: true },
        );

        await leadRepo.update(leadId, {
          latitude: coords.lat,
          longitude: coords.lon,
        } as any);

        this.logger.log(
          `LeadGeocoderService: updated lead=${leadId} → ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
        );
      },
      authContext,
    );
  }

  private async geocode(address: string): Promise<GeocoderResult | null> {
    const cleaned = this.cleanAddress(address);
    const fallback = this.pinCityFallback(address);

    for (const query of [cleaned, fallback].filter(Boolean) as string[]) {
      const result = await this.nominatim(query);

      if (result) return result;
      await this.sleep(1100);
    }

    return null;
  }

  private cleanAddress(addr: string): string {
    return addr
      .replace(/\n/g, ' ')
      .replace(
        /\b(opposite|opp\.?|near|beside|behind|inside|above|below|next to)\s+[^,]+/gi,
        '',
      )
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private pinCityFallback(addr: string): string | null {
    const pin = addr.match(/\b\d{6}\b/)?.[0];
    const city = addr.match(
      /\b(Gurugram|Gurgaon|Delhi|New Delhi|Mumbai|Bangalore|Bengaluru|Hyderabad|Chennai|Pune|Kolkata|Jaipur|Lucknow|Noida|Faridabad|Ahmedabad|Surat|Indore|Bhopal|Nagpur|Chandigarh)\b/i,
    )?.[0];

    if (pin && city) return `${city} ${pin} India`;
    if (pin) return `${pin} India`;
    if (city) return `${city} India`;

    return null;
  }

  private nominatim(query: string): Promise<GeocoderResult | null> {
    return new Promise((resolve) => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
      const options = {
        headers: {
          'User-Agent': 'IDDA-CRM-Geocoder/1.0 (vaishnav19naik@gmail.com)',
        },
      };

      https
        .get(url, options, (res) => {
          let data = '';

          res.on('data', (c: Buffer) => (data += c.toString()));
          res.on('end', () => {
            try {
              const results = JSON.parse(data) as Array<{
                lat: string;
                lon: string;
              }>;

              if (results.length > 0) {
                resolve({
                  lat: parseFloat(results[0].lat),
                  lon: parseFloat(results[0].lon),
                });
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        })
        .on('error', () => resolve(null));
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
