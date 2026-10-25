import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3StorageService implements OnModuleDestroy {
  private readonly client?: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const provider = config.get<string>('STORAGE_PROVIDER', 'local');
    this.bucket = config.get<string>('S3_BUCKET', '');
    if (provider === 's3') {
      this.client = new S3Client({
        endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
        region: config.get<string>('S3_REGION', 'garage'),
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
        },
        // Garage does not implement every AWS checksum extension.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        maxAttempts: 3,
        requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 },
      });
    }
  }

  get enabled(): boolean {
    return Boolean(this.client);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!this.client) throw new Error('S3 storage is not configured');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async read(key: string): Promise<Buffer | null> {
    if (!this.client) throw new Error('S3 storage is not configured');
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return result.Body
        ? Buffer.from(await result.Body.transformToByteArray())
        : null;
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) throw new Error('S3 storage is not configured');
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }
}
