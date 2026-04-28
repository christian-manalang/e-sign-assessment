import { Elysia, t } from "elysia";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = new Elysia()
  .post(
    "/api/request",
    async ({ body, set }) => {
      try {
        const { file, senderEmail, signerEmail } = body;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const document = await prisma.document.create({
          data: {
            filename: file.name,
            pdfData: buffer,
            senderEmail,
            signerEmail,
            status: "PENDING",
          },
        });

        return {
          success: true,
          documentId: document.id,
          message: "Document uploaded successfully",
        };
      } catch (error) {
        console.error("Upload error:", error);
        set.status = 500;
        return { success: false, error: "Failed to upload document" };
      }
    },
    {
      body: t.Object({
        file: t.File(),
        senderEmail: t.String({ format: "email" }),
        signerEmail: t.String({ format: "email" }),
      }),
    }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);