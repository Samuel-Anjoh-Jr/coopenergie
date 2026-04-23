import { Global, Module } from "@nestjs/common";

import { UsersModule } from "../modules/users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ExpoPushService } from "./expo-push.service";
import { FirebaseAdminService } from "./firebase-admin.service";
import { NotificationsService } from "./notifications.service";

@Global()
@Module({
  imports: [PrismaModule, UsersModule],
  providers: [FirebaseAdminService, ExpoPushService, NotificationsService],
  exports: [FirebaseAdminService, ExpoPushService, NotificationsService],
})
export class NotificationsModule {}
