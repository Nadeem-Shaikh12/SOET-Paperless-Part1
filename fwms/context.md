# AI Document Import - Image Analysis Workflow

This document outlines the step-by-step workflow of how the FWMS backend processes and analyzes an uploaded image of a workload sheet using AI. This logic is handled by the `DualIngestService` inside `apps/api/src/modules/workload-report/ingest.service.ts`.

### 1. MIME-Type Routing
When an HOD uploads a file via the frontend, the backend checks the file's MIME type. If it starts with `image/` (e.g., `.png`, `.jpg`, `.jpeg`), it is instantly routed to the **Gemini Vision AI** pipeline instead of the standard Excel parsing algorithm.

### 2. Image Compression
Before sending the image to the AI, the backend uses the `sharp` library to automatically resize and compress the image. It scales the image to fit inside a `1600x1600` pixel box and converts it to an 80% quality JPEG. This ensures the file is small enough to upload over the network instantly without losing the crispness of the text.

### 3. Base64 Encoding
The compressed image buffer is converted into a standard Base64 string so it can be securely transmitted in an API request payload.

### 4. Constructing the AI Prompt & Schema
The backend prepares a highly specific request for the **Gemini 2.5 Flash** vision model. This request includes:
* **The Image:** The Base64 string.
* **The Instruction:** A prompt that tells the AI exactly what it's looking at ("You are a data extraction engine. Extract all data from this MGM University Teaching Workload Sheet image...").
* **The Strict JSON Schema:** To prevent the AI from returning unstructured text, the system uses "Structured Outputs" by passing a strict JSON schema. This forces Gemini to return an object matching the exact shapes and data types the database needs (e.g., `institution` as a string, `totalTeachingHours` as a number, `isAuditCourse` as a boolean).

### 5. AI Processing & Extraction
The request is sent to Google's servers. The Gemini 2.5 Flash model visually reads the table, understands the columns (even if they are a bit blurry, skewed, or hand-annotated), and extracts the structured tabular data. It runs at a very low "temperature" (`0.1`) so it doesn't hallucinate data.

### 6. Validation and Preview
The AI returns the raw JSON string. The backend parses this JSON back into a `GeminiExtractedPayload` object. Because this is executed in "Dry-Run" mode first, the data is **not** immediately saved to the database. Instead, it is sent straight back to the frontend where the HOD sees a preview table of all the extracted rows. 

### 7. Confirmation
The HOD can visually verify that the AI read the image correctly. Only when the HOD clicks "Confirm" does the frontend send a second request back to the server to officially insert those rows into the `workload_report_rows` database table.
