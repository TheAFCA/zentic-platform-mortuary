import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesService {
  constructor(private readonly config: ConfigService) {}

  // TODO: Implement S3/R2 upload logic

  async upload(
    _file: { buffer: Buffer; mimetype: string; originalname: string },
    _folder: string,
  ): Promise<string> {
    throw new Error('File upload not implemented');
  }

  async delete(_fileUrl: string): Promise<void> {
    throw new Error('File delete not implemented');
  }
}
