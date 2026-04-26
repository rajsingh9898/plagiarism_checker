# VerifyIQ - Plagiarism & AI Detection Platform

VerifyIQ is a comprehensive plagiarism and AI detection platform built with Next.js. It features an advanced suite of tools to analyze text, generate authorship fingerprints, and act as an AI writing coach.

## 🚀 Features

- **Plagiarism Detection:** Upload documents and verify originality against extensive datasets.
- **AI Content Analysis:** Integrates Google's Gemini AI (`@google/generative-ai`) to detect AI-generated content and paraphrase attempts.
- **Authorship Fingerprint:** Deep analysis of writing styles to establish authorship authenticity.
- **AI Writing Coach:** Provides actionable feedback to improve writing quality.
- **Document Support:** Parse multiple formats including PDFs (`pdf-parse`) and Word Documents (`mammoth`).
- **Authentication:** Secure user authentication via NextAuth with OTP-based email verification and password management.
- **Modern UI:** Built with Tailwind CSS, Framer Motion for animations, and Lucide React for icons.

## 🛠️ Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Database ORM:** [Prisma](https://www.prisma.io/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **AI Integration:** Google Generative AI (Gemini)
- **Email:** Nodemailer

## 🏃‍♂️ Getting Started

### Prerequisites

Ensure you have Node.js (version 18+) installed.

### Environment Variables

Rename or create a `.env` file in the root directory and add the necessary environment variables required for your database, NextAuth, and Google Gemini API.

```env
DATABASE_URL="your-database-connection-url"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
# Add other necessary SMTP variables for Nodemailer
```

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Initialize the Prisma database:
```bash
npx prisma generate
npx prisma db push
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

- `src/app`: Contains the Next.js App Router pages and API routes.
- `src/components`: Reusable UI components.
- `prisma`: Database schema and migration settings.

## 📜 License

This project is open-source and available under the terms of the MIT License.

# 👨‍💻 Developer

Raj Singh
AI & Full Stack Developer

## ⭐ If you like this project, give it a star on GitHub!