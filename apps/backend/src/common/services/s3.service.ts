import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { randomUUID } from "crypto";

const S3_CONNECTION_TIMEOUT_MS = 2000;
const S3_REQUEST_TIMEOUT_MS = 8000;
const S3_SIGNED_READ_EXPIRY_SECONDS = 3600;

@Injectable()
export class S3Service {
  private readonly bucket: string;
  private readonly region: string;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>("AWS_S3_BUCKET") || "";
    this.region = this.configService.get<string>("S3_REGION") || "eu-west-1";

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY") || "",
        secretAccessKey: this.configService.get<string>("AWS_SECRET_KEY") || "",
      },
      maxAttempts: 1,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: S3_CONNECTION_TIMEOUT_MS,
        requestTimeout: S3_REQUEST_TIMEOUT_MS,
      }),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("A file upload is required.");
    }

    if (!this.bucket) {
      throw new InternalServerErrorException(
        "AWS_S3_BUCKET is not configured.",
      );
    }

    const sanitizedFilename = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    const key = `${folder}/${randomUUID()}-${sanitizedFilename || "file"}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (error) {
      if (this.isStorageAccessDenied(error)) {
        throw new InternalServerErrorException(
          "Image upload failed: storage access is denied.",
        );
      }

      if (this.isStorageTimeout(error)) {
        throw new ServiceUnavailableException(
          "Image upload timed out. Please try again.",
        );
      }

      throw new InternalServerErrorException(
        "Image upload failed. Please try again.",
      );
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async getAccessibleUrl(url: string): Promise<string> {
    if (!url || !this.bucket) {
      return url;
    }

    const key = this.extractKeyFromUrl(url);

    if (!key) {
      return url;
    }

    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: S3_SIGNED_READ_EXPIRY_SECONDS },
      );
    } catch {
      return url;
    }
  }

  async deleteFile(url: string): Promise<void> {
    if (!url || !this.bucket) {
      return;
    }

    const key = this.extractKeyFromUrl(url);

    if (!key) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private extractKeyFromUrl(url: string) {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();
      const expectedHostPrefix = `${this.bucket.toLowerCase()}.s3.`;

      if (!host.startsWith(expectedHostPrefix)) {
        return "";
      }

      return decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
    } catch {
      return "";
    }
  }

  private isStorageAccessDenied(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();

    return (
      name.includes("accessdenied") ||
      name.includes("forbidden") ||
      message.includes("access denied") ||
      message.includes("forbidden")
    );
  }

  private isStorageTimeout(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("network")
    );
  }
}
