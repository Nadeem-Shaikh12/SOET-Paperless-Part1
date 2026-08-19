import Groq from 'groq-sdk';
import * as xlsx from 'xlsx';
import sharp from 'sharp';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiExtractedPayload {
  institution: string;
  academicYear?: string;
  semesterPart?: string;
  school?: string;
  department?: string;
  program?: string;
  subjects: any[];
  extractionMetadata?: {
    model?: string;
    processingTimeMs?: number;
    warnings?: string[];
  };
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
You are a data extraction engine. Extract all data from this MGM University Teaching Workload Sheet image.

TABLES YOU WILL SEE:
TYPE 1 — Subject-wise Workload Table columns: Sr.No | Program/Class | Subject Name | No.of Divisions | Theory Hrs/wk | Total Theory Hrs | No.of Batches | Practical Hrs/wk | Total Practical Hrs | Tutorial Hrs/wk | Total Teaching Hours | Credits L | Credits P | Credits T

Extract the data strictly according to the following JSON schema:
{
  "institution": "string",
  "academicYear": "string",
  "school": "string",
  "department": "string",
  "program": "string",
  "subjects": [
    {
      "srNo": "string",
      "programClass": "string",
      "subjectName": "string",
      "noOfDivisions": "number",
      "theoryHrsPerWeek": "number",
      "totalTheoryHrs": "number",
      "noOfBatches": "number",
      "practicalHrsPerWeek": "number",
      "totalPracticalHrs": "number",
      "tutorialHrsPerWeek": "number",
      "totalTeachingHours": "number",
      "creditL": "number",
      "creditP": "number",
      "creditT": "number",
      "isLoadTakenByOtherDept": "boolean",
      "isLoadFromOtherDept": "boolean",
      "isAuditCourse": "boolean"
    }
  ]
}

CRITICAL INSTRUCTIONS:
1. DO NOT output any <think> tags.
2. DO NOT explain your thought process.
3. OUTPUT ONLY the raw JSON object.
4. Begin your response with { and end it with }.
`;

// ─── Service ──────────────────────────────────────────────────────────────────

class DualIngestService {
  private groqClient: Groq | null = null;

  private getClient(): Groq {
    if (!this.groqClient) {
      const key = process.env.GROQ_API_KEY;
      if (!key) {
        throw new Error(
          'GROQ_API_KEY environment variable is not set. Please add it to your .env file to support Image uploads.'
        );
      }
      this.groqClient = new Groq({ apiKey: key });
    }
    return this.groqClient;
  }

  /**
   * Main ingest function that routes based on mimetype
   */
      async extract(
    fileBuffer: Buffer,
    mimeType: string,
    termId: number,
    deptId: number,
    ocrText?: string
  ): Promise<GeminiExtractedPayload> {
    
    // Route 1: Excel / CSV — use smart positional algorithm
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'text/csv'
    ) {
      return this.extractFromExcel(fileBuffer);
    }

    // Route 2: Images via Groq AI
    if (mimeType.startsWith('image/')) {
      if (ocrText) {
        return this.extractFromOcrText(ocrText);
      }
      throw new Error('OCR Text is missing. Client-side extraction failed or was skipped.');
    }

    throw new Error(`Unsupported file type: ${mimeType}. Please upload an Excel, CSV, or Image file.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART EXCEL ALGORITHM v3 — Fully Noise-Resistant
  //
  // Handles all kinds of irregularities:
  //   ✓ Columns reordered or extra columns added
  //   ✓ Blank / junk rows inside the data section
  //   ✓ Numbers stored as strings ("3" instead of 3)
  //   ✓ Formula cells that evaluate to null or string
  //   ✓ Merged cells with missing propagation
  //   ✓ All Audit course label variants (Audit, AUDIT, NC, N/C, No Credit…)
  //   ✓ Note markers anywhere in subject name (* at start, middle, or end)
  //   ✓ Unicode whitespace, \r\n in cells, trailing dots
  //   ✓ Multiple sheets — auto-picks the workload sheet
  //   ✓ Column-number row absent — falls back to fuzzy header detection
  //   ✓ Fuzzy header detection absent — falls back to positional heuristic
  //   ✓ Positional heuristic absent — returns empty with detailed warnings
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Column map: which column index holds which field ─────────────────────
  private readonly DEFAULT_COL_MAP = {
    srNo: 0, programClass: 1, subjectName: 2, divisions: 3,
    theoryHrsWk: 4, totalTheory: 5, batches: 6,
    practicalHrsWk: 7, totalPractical: 8, tutorialHrs: 9,
    totalTeaching: 10, creditL: 11, creditP: 12, creditT: 13,
  };

  // Keyword fingerprints for fuzzy header matching ──────────────────────────
  // Each column has a list of token patterns that uniquely identify it.
  // Scoring: each matching token adds weight; highest-score col wins.
  private readonly COLUMN_KEYWORDS: Record<keyof typeof this.DEFAULT_COL_MAP, string[]> = {
    srNo:           ['sr', 'sno', 'serial', 'no', '#'],
    programClass:   ['program', 'class', 'prog', 'division_class'],
    subjectName:    ['subject', 'course', 'name', 'coursename', 'subjectname'],
    divisions:      ['division', 'div', 'noofdivisions', 'noofclasses'],
    theoryHrsWk:    ['theoryhrswk', 'theoryperweek', 'lhrswk', 'thrs', 'theoryhrs'],
    totalTheory:    ['totaltheory', 'totaltheoryhrs', 'totall', 'totaltheoryhrsperweek'],
    batches:        ['batch', 'noofbatches', 'batches', 'batchno'],
    practicalHrsWk: ['practicalhrswk', 'practicalperweek', 'phrswk', 'phrs', 'practicalhrs'],
    totalPractical: ['totalpractical', 'totalpracticalhrs', 'totalp'],
    tutorialHrs:    ['tutorial', 'tut', 'tutorialhrs', 'tuthrswk'],
    totalTeaching:  ['totalteaching', 'totalhours', 'totalteachinghours', 'totalhrs', 'grandtotal'],
    creditL:        ['creditl', 'cl', 'creditsl', 'lcredit', 'theorycredi'],
    creditP:        ['creditp', 'cp', 'creditsp', 'pcredit', 'practicalcredit'],
    creditT:        ['creditt', 'ct', 'creditst', 'tcredit', 'tutorialcredit'],
  };

  // ── Noise-robust string normalizer ───────────────────────────────────────
  private clean(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/[\r\n\t]/g, ' ')      // collapse newlines/tabs to space
      .replace(/\u00a0/g, ' ')         // non-breaking space → space
      .replace(/\s+/g, ' ')            // multiple spaces → single
      .trim();
  }

  // ── Noise-robust number extractor ────────────────────────────────────────
  // Handles: null, undefined, "", "N/A", "—", "-", numbers, "3.0", " 5 "
  private safeNum(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = this.clean(v);
    if (!s || s === 'N/A' || s === '-' || s === '—' || s === 'na') return 0;
    const n = parseFloat(s.replace(/,/g, ''));     // handle "1,000" style
    return isNaN(n) ? 0 : Math.abs(n);            // negative hrs → treat as 0
  }

  // ── Audit course detector ─────────────────────────────────────────────────
  // Catches: "Audit", "AUDIT", "audit course", "NC", "N/C", "No Credit",
  //          "non-credit", "0*", "audit*", numeric 0 when no hrs exist
  private isAuditCredit(v: any, subjectName: string): boolean {
    if (v === null || v === undefined) return false;
    const s = this.clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      s === 'audit' || s === 'auditcourse' || s === 'nc' || s === 'nocredit' ||
      s === 'noncredit' || s === 'nomarks' || s === '0' ||
      subjectName.toLowerCase().includes('(audit)') ||
      subjectName.toLowerCase().includes('[audit]')
    );
  }

  // ── Note marker detector ──────────────────────────────────────────────────
  // Catches * or ** anywhere: at end, in middle, at start, surrounded by spaces
  private detectMarkers(raw: string): { clean: string; takenByOther: boolean; fromOther: boolean } {
    const s = raw;
    // Count stars — longest run of * determines the type
    const doubleMatch = /\*{2,}/.test(s);
    const singleMatch = !doubleMatch && /\*/.test(s);
    // Remove all * clusters and trim
    const clean = s.replace(/\s*\*+\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return { clean, takenByOther: singleMatch, fromOther: doubleMatch };
  }

  // ── Footer / noise row detector ───────────────────────────────────────────
  private isNoisyRow(text: string): boolean {
    const t = text.toLowerCase();
    return (
      t.includes('head of department') || t.includes('head of institute') ||
      t.includes('dean')               || t.includes('signature') ||
      t.includes('prepared by')        || t.includes('verified by') ||
      t.includes('checked by')         || t.includes('approved by') ||
      t.includes('place:')             || t.includes('date:') ||
      t.startsWith('note')             || t.startsWith('*note') ||
      t.startsWith('remark')           || t.startsWith('legend')
    );
  }

  // ── Annotation row detector (formula hints like "(4*5)") ──────────────────
  private isAnnotationRow(row: any[]): boolean {
    if (!row) return false;
    const nonNull = row.filter(v => this.clean(v) !== '');
    if (nonNull.length === 0) return true;
    return nonNull.every(v => /^\([\d\s\+\-\*\/]+\)$/.test(this.clean(v)));
  }

  // ── Best sheet selector ───────────────────────────────────────────────────
  // Prefers sheets whose name contains "workload", "teaching", "faculty"
  private pickBestSheet(workbook: xlsx.WorkBook): xlsx.WorkSheet {
    const preferred = workbook.SheetNames.find(name => {
      const n = name.toLowerCase();
      return n.includes('workload') || n.includes('teaching') || n.includes('faculty');
    });
    const sheetName = preferred ?? workbook.SheetNames[0];
    return workbook.Sheets[sheetName];
  }

  // ── Metadata extractor (first 10 rows) ────────────────────────────────────
  private extractMetadata(allRows: any[][]): {
    institution: string; academicYear: string; school: string; department: string;
  } {
    let institution = '', academicYear = '', school = '', department = '';
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      // Scan all cells in the row, not just column A
      for (const cell of (allRows[i] ?? [])) {
        const s = this.clean(cell);
        if (!s) continue;
        const l = s.toLowerCase();
        if (!institution && (l.includes('university') || l.includes('mgm') || l.includes('institute of')))
          institution = s;
        else if (!academicYear && l.includes('academic'))
          academicYear = s.replace(/academic\s+year\s*/i, '').trim();
        else if (!school && (l.includes('school of') || l.includes('faculty of') || l.includes('soet')))
          school = s;
        else if (!department && l.includes('department'))
          department = s;
      }
    }
    return { institution, academicYear, school, department };
  }

  // ── STRATEGY A: Column-number row detection ───────────────────────────────
  // Finds the row "1 2 3 4 5 …" which precedes the data rows.
  // Tolerates: string numbers, extra leading zeros, gaps, non-sequential starts.
  private findDataStartViaColNumberRow(allRows: any[][]): number {
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row) continue;
      const nonNull = row.map(v => this.clean(v)).filter(v => v !== '');
      if (nonNull.length < 3) continue;
      // Row is a column-number row if first 4 non-null values are "1","2","3","4"
      // (in any string/number form, allowing "01","1.","1 " etc.)
      const asNums = nonNull.slice(0, 4).map(v => parseInt(v.replace(/\D/g, ''), 10));
      if (asNums[0] === 1 && asNums[1] === 2 && asNums[2] === 3 && asNums[3] === 4) {
        let next = i + 1;
        while (next < allRows.length && this.isAnnotationRow(allRows[next])) next++;
        return next;
      }
    }
    return -1;
  }

  // ── STRATEGY B: Fuzzy keyword header detection ────────────────────────────
  // Scans rows 0-20 to find header rows by keyword matching.
  // Builds a column map so that ANY column order works.
  private buildColumnMapFromHeaders(allRows: any[][]): (typeof this.DEFAULT_COL_MAP) | null {
    const SCAN_LIMIT = Math.min(20, allRows.length);
    // Score[colIdx][fieldKey] = match score
    const scores: Record<number, Record<string, number>> = {};

    for (let r = 0; r < SCAN_LIMIT; r++) {
      const row = allRows[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const token = this.clean(row[c]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!token || token.length < 2) continue;
        if (!scores[c]) scores[c] = {};
        for (const [field, keywords] of Object.entries(this.COLUMN_KEYWORDS)) {
          for (const kw of keywords) {
            if (token === kw || token.includes(kw) || kw.includes(token)) {
              scores[c][field] = (scores[c][field] ?? 0) + (token === kw ? 3 : 1);
            }
          }
        }
      }
    }

    // For each field, pick the column with the highest score (≥ threshold)
    const THRESHOLD = 2;
    const result: Partial<typeof this.DEFAULT_COL_MAP> = {};
    const usedCols = new Set<number>();

    for (const field of Object.keys(this.DEFAULT_COL_MAP) as (keyof typeof this.DEFAULT_COL_MAP)[]) {
      let bestCol = -1, bestScore = THRESHOLD - 1;
      for (const [colStr, fieldScores] of Object.entries(scores)) {
        const col = parseInt(colStr, 10);
        if (usedCols.has(col)) continue;
        const score = fieldScores[field] ?? 0;
        if (score > bestScore) { bestScore = score; bestCol = col; }
      }
      if (bestCol >= 0) {
        (result as any)[field] = bestCol;
        usedCols.add(bestCol);
      } else {
        // Fall back to default position for this field
        (result as any)[field] = this.DEFAULT_COL_MAP[field];
      }
    }

    // Validate: must at least detect subjectName column reliably
    if ((result.subjectName ?? -1) < 0) return null;
    return result as typeof this.DEFAULT_COL_MAP;
  }

  // ── STRATEGY C: Heuristic data-row finder ────────────────────────────────
  // Scans for the first row that looks like a subject data row:
  // col 2 (or detected subjectName col) is a non-empty, non-numeric string
  // AND at least one numeric value exists in the row.
  private findDataStartHeuristic(allRows: any[][], subjectCol: number): number {
    for (let i = 3; i < allRows.length; i++) {
      const row = allRows[i];
      if (!row) continue;
      const subj = this.clean(row[subjectCol]);
      if (!subj || subj.length < 2) continue;
      if (/^\d+$/.test(subj)) continue;                    // purely numeric → not a subject
      if (subj.toLowerCase().startsWith('total')) continue;
      if (this.isNoisyRow(subj)) continue;
      // Must have at least one numeric value somewhere in the row
      const hasNum = row.some(v => v !== null && v !== undefined && !isNaN(parseFloat(this.clean(v))));
      if (hasNum) return i;
    }
    return -1;
  }

  // ── MAIN Excel extraction entry point ─────────────────────────────────────
  private extractFromExcel(buffer: Buffer): GeminiExtractedPayload {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // ── STEP 1: Smart sheet selection ────────────────────────────────────────
    const worksheet = this.pickBestSheet(workbook);
    const allRows: any[][] = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    // ── STEP 2: Extract metadata from any of the first 10 rows ───────────────
    const { institution, academicYear, school, department } = this.extractMetadata(allRows);

    const warnings: string[] = [];
    let colMap = { ...this.DEFAULT_COL_MAP };
    let dataStartRow = -1;
    let strategyUsed = '';

    // ── STEP 3: Detect column layout + data start (3 strategies in order) ────

    // Strategy A — Column-number row ("1","2","3","4"…)
    dataStartRow = this.findDataStartViaColNumberRow(allRows);
    if (dataStartRow !== -1) {
      strategyUsed = 'Strategy A (column-number row detected)';
    }

    // Strategy B — Fuzzy keyword header matching
    if (dataStartRow === -1) {
      const detected = this.buildColumnMapFromHeaders(allRows);
      if (detected) {
        colMap = detected;
        // Find data start: first row AFTER headers where subjectName col is a non-empty string
        dataStartRow = this.findDataStartHeuristic(allRows, colMap.subjectName);
        if (dataStartRow !== -1) {
          strategyUsed = 'Strategy B (fuzzy header detection — columns may be reordered)';
          warnings.push(`Column layout was auto-detected by keyword matching. ${strategyUsed}`);
        }
      }
    }

    // Strategy C — Pure heuristic (find first row that looks like a subject row)
    if (dataStartRow === -1) {
      dataStartRow = this.findDataStartHeuristic(allRows, this.DEFAULT_COL_MAP.subjectName);
      if (dataStartRow !== -1) {
        strategyUsed = 'Strategy C (heuristic data-row detection — no headers found)';
        warnings.push(`No standard header structure found. ${strategyUsed}`);
      }
    }

    // All strategies failed
    if (dataStartRow === -1) {
      warnings.push('Could not detect data rows. The file structure is unrecognized.');
      return {
        institution: institution || 'MGM University (Imported via Spreadsheet)',
        academicYear, school, department,
        subjects: [],
        extractionMetadata: {
          model: 'Smart Excel Algorithm v3 (Noise-Resistant)',
          warnings,
        },
      };
    }

    // ── STEP 4: Parse data rows with full noise resistance ────────────────────
    const subjects: any[] = [];
    let lastSrNo: any = null;
    let lastProgramClass = '';
    let lastTotalTeaching: number | null = null;
    let srCounter = 0;
    let consecutiveEmptyRows = 0;
    const MAX_EMPTY_GAP = 5; // tolerate up to 5 consecutive blank rows mid-table

    for (let i = dataStartRow; i < allRows.length; i++) {
      const row = allRows[i] ?? [];

      // ── Get subject cell (use detected or default column) ───────────────────
      const subjectRaw = this.clean(row[colMap.subjectName]);

      // ── Stop conditions ─────────────────────────────────────────────────────
      if (!subjectRaw) {
        consecutiveEmptyRows++;
        if (consecutiveEmptyRows >= MAX_EMPTY_GAP) break; // end of table
        continue; // tolerate single blank rows within the table
      }
      consecutiveEmptyRows = 0;

      const subLower = subjectRaw.toLowerCase();
      if (subLower.startsWith('total') || subLower.startsWith('grand total')) break;
      if (this.isNoisyRow(subjectRaw)) break;

      // ── Propagate merged cells downward ─────────────────────────────────────
      const rawSrNo   = this.clean(row[colMap.srNo]);
      const rawClass  = this.clean(row[colMap.programClass]);
      const rawTotal  = row[colMap.totalTeaching];

      if (rawSrNo !== '') { lastSrNo = rawSrNo; srCounter++; }
      if (rawClass !== '') lastProgramClass = rawClass;
      if (rawTotal !== null && rawTotal !== undefined && !isNaN(parseFloat(this.clean(rawTotal)))) {
        lastTotalTeaching = this.safeNum(rawTotal);
      }

      // ── Note markers: detect *, ** anywhere in subject name ─────────────────
      const { clean: cleanSubject, takenByOther, fromOther } = this.detectMarkers(subjectRaw);

      // ── Audit course detection ───────────────────────────────────────────────
      const creditLRaw = row[colMap.creditL];
      const isAuditCourse = this.isAuditCredit(creditLRaw, cleanSubject);
      const creditL = isAuditCourse ? 0 : this.safeNum(creditLRaw);

      // ── Compute totalTeachingHours with fallback ─────────────────────────────
      // Priority: propagated merged value → direct cell value → sum theory+practical+tutorial
      const directTotal = this.safeNum(rawTotal);
      const summedTotal =
        this.safeNum(row[colMap.totalTheory]) +
        this.safeNum(row[colMap.totalPractical]) +
        this.safeNum(row[colMap.tutorialHrs]);
      const totalTeachingHours =
        (lastTotalTeaching !== null && lastTotalTeaching > 0) ? lastTotalTeaching :
        (directTotal > 0 ? directTotal : summedTotal);

      subjects.push({
        srNo:                lastSrNo ?? srCounter,
        programClass:        lastProgramClass,
        subjectName:         cleanSubject,
        noOfDivisions:       this.safeNum(row[colMap.divisions])    || 1,
        theoryHrsPerWeek:    this.safeNum(row[colMap.theoryHrsWk]),
        totalTheoryHrs:      this.safeNum(row[colMap.totalTheory]),
        noOfBatches:         this.safeNum(row[colMap.batches]),
        practicalHrsPerWeek: this.safeNum(row[colMap.practicalHrsWk]),
        totalPracticalHrs:   this.safeNum(row[colMap.totalPractical]),
        tutorialHrsPerWeek:  this.safeNum(row[colMap.tutorialHrs]),
        totalTeachingHours,
        creditL,
        creditP:             this.safeNum(row[colMap.creditP]),
        creditT:             this.safeNum(row[colMap.creditT]),
        isLoadTakenByOtherDept: takenByOther,
        isLoadFromOtherDept:    fromOther,
        isAuditCourse,
      });
    }

    if (subjects.length === 0) {
      warnings.push('No subjects could be extracted. Verify that the file matches a known workload sheet format.');
    }

    return {
      institution:  institution || 'MGM University (Imported via Spreadsheet)',
      academicYear, school, department,
      subjects,
      extractionMetadata: {
        model: `Smart Excel Algorithm v3 — Noise-Resistant (${strategyUsed})`,
        warnings,
      },
    };
  }

  /**
   * Groq LLaMA Text AI extraction using client-side OCR text
   */
  private async extractFromOcrText(ocrText: string): Promise<GeminiExtractedPayload> {
    const ai = this.getClient();
    
    const response = await ai.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: "Here is the raw text extracted from the document via OCR:\n\n" + ocrText }
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });

    const rawJson = response.choices[0]?.message?.content;
    if (!rawJson) {
      throw new Error("AI returned an empty response.");
    }
    
    let parsed: GeminiExtractedPayload;
    try {
      // Strip reasoning blocks if present
      let cleanedJson = rawJson;
      const thinkEnd = cleanedJson.lastIndexOf('</think>');
      if (thinkEnd !== -1) {
        cleanedJson = cleanedJson.substring(thinkEnd + 8);
      }
      
      const firstBrace = cleanedJson.indexOf('{');
      const lastBrace = cleanedJson.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON object found in response");
      }
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
      parsed = JSON.parse(cleanedJson);
    } catch (e) {
      console.error("Raw JSON output:", rawJson);
      throw new Error("AI returned malformed JSON.");
    }

    return parsed;
  }
}

export const ingestService = new DualIngestService();
// Maintain backwards compatibility alias for routes.ts
export const geminiIngestService = ingestService;
