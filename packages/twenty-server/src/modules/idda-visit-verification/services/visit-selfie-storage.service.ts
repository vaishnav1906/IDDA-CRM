import fs from 'fs';
import path from 'path';

import { Injectable, Logger } from '@nestjs/common';

import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

@Injectable()
export class VisitSelfieStorageService {
  private readonly logger = new Logger(VisitSelfieStorageService.name);

  constructor(
    private readonly twentyConfigService: TwentyConfigService,
  ) {}

  async storeSelfie(
    imageBuffer: Buffer,
    mimeType: string,
    workspaceId: string,
    visitId: string,
  ): Promise<string> {
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `${visitId}.${ext}`;
    const storedPath = `visit-selfie/${filename}`;

    const storageRoot =
      this.twentyConfigService.get('STORAGE_LOCAL_PATH') ?? '.local-storage';

    const dir = path.resolve(storageRoot, workspaceId, 'visit-selfie');

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), imageBuffer);

    this.logger.log(
      `Stored selfie for visitId=${visitId} at ${dir}/${filename}`,
    );

    return storedPath;
  }

  getLocalSelfieePath(workspaceId: string, storedPath: string): string | null {
    const storageRoot =
      this.twentyConfigService.get('STORAGE_LOCAL_PATH') ?? '.local-storage';

    const fullPath = path.resolve(storageRoot, workspaceId, storedPath);

    return fs.existsSync(fullPath) ? fullPath : null;
  }
}
