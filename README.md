# E-Sign Assessment

A high-performance, full-stack e-signature platform built with the modern **Bun** ecosystem. This application allows users to upload PDFs, request signatures via secure email links, and interactively place, scale, and "stamp" signatures onto any page of a document.

> [!IMPORTANT]
> **Note on Live Deployment:** The backend API is hosted on Render's free tier. If the server has been inactive, the very first request (e.g., uploading a document) may take **up to 50 seconds** to wake up. Subsequent interactions will be instantaneous.

## Live Links

- **Frontend:** [https://e-sign-assessment.vercel.app](https://e-sign-assessment.vercel.app)
- **Backend:** [https://e-sign-assessment.onrender.com](https://e-sign-assessment.onrender.com)

## Tech Stack

| Layer              | Technology                                        |
| :----------------- | :------------------------------------------------ |
| **Runtime**        | **Bun** (Fastest JS all-in-one toolkit)           |
| **Backend**        | **ElysiaJS** (High-performance web framework)     |
| **Frontend**       | **React (Vite)** + TypeScript + Tailwind CSS      |
| **Database**       | **Neon** (Serverless PostgreSQL) + **Prisma ORM** |
| **PDF Processing** | **pdf-lib** (Low-level PDF manipulation)          |
| **Email**          | **Resend** (HTTP API Integration)           |
| **Testing**        | **bun:test** + GitHub Actions (CI/CD)             |

> [!NOTE]
> **Email Demo Limitation:** This project currently uses the Resend **Onboarding Domain**. During this demonstration phase, automated emails (signature requests and completion notices) will **only** be delivered to the developer's registered email address. To enable delivery to any recipient, a custom domain must be verified in the Resend dashboard.

## Key Features

### 1. Interactive Multi-Page Signing

Unlike basic implementations that only sign the last page, this app allows signers to navigate through the entire document and place signatures on any page.

- **Smart Scaling:** Signatures can be resized (0.5x to 5.0x) and maintain their relative size regardless of screen resolution.
- **Page-Aware Placement:** Signatures are mapped to the exact PDF coordinate system using a calculated scale ratio between the rendered UI and the actual PDF dimensions.

### 2. Multi-Modal Capture

Signers can provide their signature through three different modes:

- **Draw:** Interactive signature pad.
- **Type:** Choice of professional cursive fonts.
- **Upload:** Support for transparent PNG/JPG signature images.

### 3. Enterprise-Grade Workflow

- **Secure Unique Links:** Every document request generates a unique UUID that serves as the secure access link.
- **Automatic Delivery:** Once signed, the final "stamped" PDF is automatically generated on the server and sent to both the sender and the signer.
- **Persistent Storage:** PDFs are stored as `Bytes` in Neon PostgreSQL, ensuring no data loss on ephemeral hosting.

## Architecture & Workflow

1.  **The Request:** Sender uploads a PDF. The backend stores the file in Neon and sends a secure email via Resend HTTP API.
2.  **The Interaction:** The Signer opens the Vercel link. The frontend fetches the PDF from Render and renders it using `react-pdf`.
3.  **The Stamp:** Upon signing, the backend uses `pdf-lib` to embed the signature image(s) onto the correct pages and coordinates.
4.  **Completion:** The document status is updated to `SIGNED`, and the final PDF is dispatched.

## Automated Testing

This project maintains a 100% pass rate in GitHub Actions. The CI pipeline:

1.  Spins up a temporary **Postgres 15** service.
2.  Synchronizes the schema using `prisma db push`.
3.  Executes the **Bun test suite** to verify core API endpoints (Upload, Retrieve, Sign).

## Local Setup

### Clone the repository

```bash
git clone [https://github.com/christian-manalang/e-sign-assessment.git](https://github.com/christian-manalang/e-sign-assessment.git)
```

### Backend Setup

```
cd backend
bun install

# Configure environment variables in .env:
# DATABASE_URL, RESEND_API_KEY, and FRONTEND_URL

bunx prisma db push
bun src/index.ts
```

### Frontend Setup

```
cd frontend
bun install

# Configure environment variables in .env:
# Set VITE_API_URL to your backend URL

bun run dev
```
