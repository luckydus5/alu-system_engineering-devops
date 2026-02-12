/**
 * Advanced Multi-Company Attendance Classifier
 * 
 * Auto-detects company from Excel "Department" column values and routes
 * records to the correct company/department. Handles mixed-company Excel
 * files where HQ Power, HQ Service, HQ Peat, and Farmers appear together.
 */

export interface CompanyMapping {
  companyId: string;
  companyName: string;
  companyCode: string;
}

export interface ClassificationResult {
  company: CompanyMapping | null;
  departmentId: string | null;
  confidence: 'exact' | 'keyword' | 'fallback' | 'none';
  rawDeptText: string;
}

export interface ClassificationSummary {
  totalRows: number;
  classified: number;
  unclassified: number;
  byCompany: Record<string, { count: number; companyName: string }>;
}

interface CompanyDef {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
}

interface DeptDef {
  id: string;
  name: string;
  code: string;
  company_id: string | null;
}

/**
 * Keyword rules for company detection.
 * Order matters — more specific patterns first to avoid false matches.
 * E.g., "HQ Peat Staff" should match HQ Peat, not HQ Power.
 */
const COMPANY_KEYWORD_RULES: { code: string; patterns: RegExp[] }[] = [
  // Farmers — most specific first
  {
    code: 'FARM',
    patterns: [
      /\bfarmers?\b/i,
      /\bfarm\b/i,
      /\bpeatshed\b/i,
      /\bagri/i,
    ],
  },
  // HQ Peat (must check before HQ Power since "HQ P" could match both)
  {
    code: 'HQPEAT',
    patterns: [
      /\bhq\s*peat\b/i,
      /\bpeat\s*staff\b/i,
      /\bpeat\b(?!.*power)/i,
      /\bhqpeat\b/i,
    ],
  },
  // HQ Service
  {
    code: 'HQSVC',
    patterns: [
      /\bhq\s*service\b/i,
      /\bservice\b/i,
      /\bhqsvc\b/i,
      /\bsvc\b/i,
    ],
  },
  // HQ Power — parent company, broadest match last
  {
    code: 'HQP',
    patterns: [
      /\bhq\s*power\b/i,
      /\bpower\b/i,
      /\bhqp\b/i,
    ],
  },
];

/**
 * Build a classifier function for a given set of companies and departments.
 */
export function buildClassifier(companies: CompanyDef[], departments: DeptDef[]) {
  // Pre-build company lookup by code and name
  const companyByCode = new Map<string, CompanyDef>();
  const companyByNameLower = new Map<string, CompanyDef>();
  companies.forEach(c => {
    companyByCode.set(c.code.toUpperCase(), c);
    companyByNameLower.set(c.name.toLowerCase(), c);
  });

  // Department lookup by name (lowered)
  const deptByNameLower = new Map<string, DeptDef>();
  departments.forEach(d => {
    deptByNameLower.set(d.name.toLowerCase(), d);
  });

  /**
   * Classify a single Excel "Department" text value.
   */
  function classify(excelDept: string, fallbackCompanyId?: string): ClassificationResult {
    const raw = (excelDept || '').trim();
    if (!raw) {
      // No department text — use fallback
      if (fallbackCompanyId) {
        const c = companies.find(co => co.id === fallbackCompanyId);
        if (c) {
          return {
            company: { companyId: c.id, companyName: c.name, companyCode: c.code },
            departmentId: null,
            confidence: 'fallback',
            rawDeptText: raw,
          };
        }
      }
      return { company: null, departmentId: null, confidence: 'none', rawDeptText: raw };
    }

    const searchLower = raw.toLowerCase();

    // 1. Exact company name match
    const exactCompany = companyByNameLower.get(searchLower);
    if (exactCompany) {
      return {
        company: { companyId: exactCompany.id, companyName: exactCompany.name, companyCode: exactCompany.code },
        departmentId: null,
        confidence: 'exact',
        rawDeptText: raw,
      };
    }

    // 2. Exact company code match
    const codeMatch = companyByCode.get(raw.toUpperCase());
    if (codeMatch) {
      return {
        company: { companyId: codeMatch.id, companyName: codeMatch.name, companyCode: codeMatch.code },
        departmentId: null,
        confidence: 'exact',
        rawDeptText: raw,
      };
    }

    // 3. Keyword-based matching (ordered rules)
    for (const rule of COMPANY_KEYWORD_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(raw)) {
          const c = companyByCode.get(rule.code);
          if (c) {
            return {
              company: { companyId: c.id, companyName: c.name, companyCode: c.code },
              departmentId: null,
              confidence: 'keyword',
              rawDeptText: raw,
            };
          }
        }
      }
    }

    // 4. Partial company name match (contains)
    for (const [name, c] of companyByNameLower) {
      if (searchLower.includes(name) || name.includes(searchLower)) {
        return {
          company: { companyId: c.id, companyName: c.name, companyCode: c.code },
          departmentId: null,
          confidence: 'keyword',
          rawDeptText: raw,
        };
      }
    }

    // 5. Department name match → infer company from dept's company_id
    const deptMatch = deptByNameLower.get(searchLower);
    if (deptMatch) {
      let companyMapping: CompanyMapping | null = null;
      if (deptMatch.company_id) {
        const c = companies.find(co => co.id === deptMatch.company_id);
        if (c) companyMapping = { companyId: c.id, companyName: c.name, companyCode: c.code };
      }
      return {
        company: companyMapping,
        departmentId: deptMatch.id,
        confidence: 'exact',
        rawDeptText: raw,
      };
    }

    // 6. Fallback to selected company
    if (fallbackCompanyId) {
      const c = companies.find(co => co.id === fallbackCompanyId);
      if (c) {
        return {
          company: { companyId: c.id, companyName: c.name, companyCode: c.code },
          departmentId: null,
          confidence: 'fallback',
          rawDeptText: raw,
        };
      }
    }

    return { company: null, departmentId: null, confidence: 'none', rawDeptText: raw };
  }

  /**
   * Classify an array of department texts and return summary stats.
   */
  function classifyBatch(deptTexts: string[], fallbackCompanyId?: string): {
    results: ClassificationResult[];
    summary: ClassificationSummary;
  } {
    const results = deptTexts.map(t => classify(t, fallbackCompanyId));
    const byCompany: ClassificationSummary['byCompany'] = {};
    let classified = 0;
    let unclassified = 0;

    results.forEach(r => {
      if (r.company) {
        classified++;
        if (!byCompany[r.company.companyId]) {
          byCompany[r.company.companyId] = { count: 0, companyName: r.company.companyName };
        }
        byCompany[r.company.companyId].count++;
      } else {
        unclassified++;
      }
    });

    return {
      results,
      summary: {
        totalRows: deptTexts.length,
        classified,
        unclassified,
        byCompany,
      },
    };
  }

  return { classify, classifyBatch };
}
