import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

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
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("A file upload is required.");
    }

    if (!this.bucket) {
      throw new InternalServerErrorException("AWS_S3_BUCKET is not configured.");
    }

    const sanitizedFilename = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    const key = `${folder}/${randomUUID()}-${sanitizedFilename || "file"}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
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
      return decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
    } catch {
      return "";
    }
  }
}