import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

import { type FileTokenJwtPayload } from 'src/engine/core-modules/auth/types/file-token-jwt-payload.type';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';

/**
 * Validates the signed token on GET /visit-clinic-photo/:visitId?token=...
 *
 * The token is produced by FileUrlService.signFileByIdUrl() with
 * fileId = visitId and fileFolder = ClinicPhoto. This guard confirms the
 * token is valid and that fileId matches the URL param before allowing the
 * controller to read the file from disk.
 */
@Injectable()
export class ClinicPhotoServeGuard implements CanActivate {
  constructor(private readonly jwtWrapperService: JwtWrapperService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const visitId: string | undefined = request.params?.visitId;
    const token: string | undefined = request.query?.token;

    if (!visitId || !token) return false;

    // visitId must be a UUID — reject anything containing path separators
    if (!/^[0-9a-f-]{36}$/i.test(visitId)) return false;

    try {
      await this.jwtWrapperService.verifyJwtToken(token, {
        ignoreExpiration: false,
      });

      const decoded = this.jwtWrapperService.decode<FileTokenJwtPayload>(token, {
        json: true,
      });

      if (!decoded?.workspaceId || decoded.fileId !== visitId) return false;

      request.workspaceId = decoded.workspaceId;

      return true;
    } catch {
      return false;
    }
  }
}
