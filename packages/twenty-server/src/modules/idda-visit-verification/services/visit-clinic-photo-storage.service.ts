import fs from 'fs';
import path from 'path';

import { Injectable, Logger } from '@nestjs/common';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class VisitClinicPhotoStorageService {
  private readonly logger = new Logger(VisitClinicPhotoStorageService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async storePhoto(
    imageBuffer: Buffer,
    mimeType: string,
    workspaceId: string,
    visitId: string,
  ): Promise<string> {
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `${visitId}.${ext}`;
    const storedPath = `clinic-photo/${filename}`;

    const storageRoot =
      this.twentyConfigService.get('STORAGE_LOCAL_PATH') ?? '.local-storage';

    const dir = path.resolve(storageRoot, workspaceId, 'clinic-photo');
    const fullFilePath = path.join(dir, filename);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullFilePath, imageBuffer);

    return storedPath;
  }

  getLocalPhotoPath(workspaceId: string, storedPath: string): string | null {
    const storageRoot =
      this.twentyConfigService.get('STORAGE_LOCAL_PATH') ?? '.local-storage';

    const fullPath = path.resolve(storageRoot, workspaceId, storedPath);

    return fs.existsSync(fullPath) ? fullPath : null;
  }
}
