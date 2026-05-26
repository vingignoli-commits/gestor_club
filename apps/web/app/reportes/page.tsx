'use client';

import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '../../components/section-card';
import { api } from '../../lib/api';

type Tab = 'financiero' | 'deudores' | 'recaudacion' | 'categorias';

type DebtorMonth = {
  periodYear: number;
  periodMonth: number;
  label: string;
  category: string;
  amount: number;
  overdue: boolean;
  isCurrentMonth: boolean;
};

type Debtor = {
  id: string;
  matricula: string;
  firstName: string;
  lastName: string;
  category: string;
  status: string;
  phone: string | null;
  debt: number;
  monthsOwed: number;
  owesCurrentMonth: boolean;
  overdueMonthsCount: number;
  overdueMonthLabels: string[];
  debtLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  debtLevelLabel: string;
  debtColor: 'gray' | 'green' | 'yellow' | 'red';
  months: DebtorMonth[];
};

type MonthlyCollection = {
  month: string;
  period?: string;
  total: number;
};

type CategorySummary = {
  category: string;
  active: number;
  inactive: number;
  total: number;
};

type FinancialSummary = {
  generatedAt: string;
  currentMonth: string;
  currentPeriod: string;

  cashBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;

  liabilities: number;
  accountsReceivable: number;
  debtorsCount: number;
  debtorsPercentage: number;
  averageDebtPerDebtor: number;

  activeMembers: number;
  inactiveMembers: number;
  totalMembers: number;

  averageMonthlyCollection: number;
  averageExpense: number;
  monthlyBurnRate: number;
  monthsOfCoverage: number | null;

  collectionHistory: Array<{
    period: string;
    label: string;
    total: number;
  }>;

  expenseHistory: Array<{
    period: string;
    label: string;
    total: number;
  }>;

  debtAging: {
    oneMonth: number;
    twoToThree: number;
    fourToSix: number;
    overSix: number;
  };

  categoryIncome: Array<{
    category: string;
    total: number;
  }>;

  categoryExpense: Array<{
    category: string;
    total: number;
  }>;

  categoryExpectedCollection: Array<{
    category: string;
    activeMembers: number;
    unitAmount: number;
    expectedTotal: number;
  }>;

  topDebtors: Array<{
    id: string;
    fullName: string;
    matricula: string;
    category: string;
    status: string;
    totalDebt: number;
    monthsOwed: number;
    overdueMonthsCount: number;
    debtLevel: string;
    debtLevelLabel: string;
  }>;

  monthlyComparison: Array<{
    period: string;
    label: string;
    income: number;
    expense: number;
    net: number;
    projected?: boolean;
  }>;

  expectedCurrentMonthCollection: number;
  currentMonthCollection: number;
  collectionEffectiveness: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  SIMPLE: 'Simple',
  DOBLE: 'Doble',
  ESTUDIANTE: 'Estudiante',
  SOCIAL: 'Social',
  MENOR: 'Menor',
  HONOR: 'Honor',
};

const INCOME_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Cuotas',
  SALE: 'Ventas',
  DONATION: 'Donaciones',
  TRAINING: 'Capacitaciones',
  OTHER: 'Otros ingresos',
};

const EXPENSE_LABELS: Record<string, string> = {
  GRAN_LOGIA: 'Cuota GRAN LOGIA',
  CIVIL_ARMONIA: 'Cuota Civil Armonía',
  SUPPLIES: 'Insumos',
  SERVICES: 'Servicios',
  SALARY: 'Salarios',
  MAINTENANCE: 'Mantenimiento',
  OTHER: 'Otros egresos',
};

const DEBT_BADGE_STYLES: Record<Debtor['debtColor'], string> = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function fmtPercent(n: number) {
  return `${Number(n || 0).toFixed(1)}%`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function categoryLabel(value: string) {
  return CATEGORY_LABELS[value] ?? value;
}

function incomeLabel(value: string) {
  return INCOME_LABELS[value] ?? value;
}

function expenseLabel(value: string) {
  return EXPENSE_LABELS[value] ?? value;
}

function shortMonthLabel(value: string) {
  const parts = value.split(' ');
  if (parts.length < 2) return value;
  return `${parts[0].slice(0, 3)} ${parts[1].slice(2)}`;
}

function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="ml-2 inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-ink/20 text-xs font-bold text-ink/50"
    >
      ?
    </span>
  );
}

function signedTone(value: number) {
  if (value > 0) return 'text-emerald-700';
  if (value < 0) return 'text-rose-700';
  return 'text-ink';
}

function barWidth(value: number, max: number) {
  if (max <= 0) return '0%';
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('financiero');
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [monthly, setMonthly] = useState<MonthlyCollection[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryValues, setCategoryValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.get<Debtor[]>('/reports/debtors'),
      api.get<MonthlyCollection[]>('/reports/monthly-collection'),
      api.get<CategorySummary[]>('/reports/members-by-category'),
      api.get<FinancialSummary>('/reports/financial-summary'),
    ])
      .then(([d, m, c, f]) => {
        setDebtors(d);
        setMonthly(m);
        setCategories(c);
        setFinancial(f);

        setCategoryValues((prev) => {
          const next = { ...prev };
          for (const category of c) {
            if (next[category.category] === undefined) {
              next[category.category] = '';
            }
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.debt, 0);
  const totalCollected = monthly.reduce((sum, item) => sum + item.total, 0);

  const categoryCalculationRows = useMemo(() => {
    return categories.map((category) => {
      const unitValue = Number(categoryValues[category.category] || 0);
      const totalValue = unitValue * category.active;

      return {
        category: category.category,
        activeMembers: category.active,
        unitValue,
        totalValue,
      };
    });
  }, [categories, categoryValues]);

  const totalCategoryProjection = useMemo(() => {
    return categoryCalculationRows.reduce((sum, row) => sum + row.totalValue, 0);
  }, [categoryCalculationRows]);

  const maxMonthlyValue = useMemo(() => {
    if (!financial) return 0;

    return Math.max(
      ...financial.monthlyComparison.map((item) =>
        Math.max(item.income, item.expense),
      ),
      0,
    );
  }, [financial]);

  const totalIncomeByCategory = useMemo(() => {
    return financial?.categoryIncome.reduce((sum, item) => sum + item.total, 0) ?? 0;
  }, [financial]);

  const totalExpenseByCategory = useMemo(() => {
    return financial?.categoryExpense.reduce((sum, item) => sum + item.total, 0) ?? 0;
  }, [financial]);

  function reportTitle() {
    if (tab === 'financiero') return 'Reporte financiero general';
    if (tab === 'deudores') return 'Reporte de socios deudores';
    if (tab === 'recaudacion') return 'Reporte de recaudación mensual';
    return 'Reporte de socios por categoría';
  }

  function reportCriteria() {
    if (tab === 'financiero') {
      return [
        'Fuente: caja, pagos, cuotas vigentes, padrón activo e historial de deuda.',
        'Criterio: consolidación financiera a la fecha de emisión.',
        'Incluye: saldo de caja, activos por cobrar, pasivos estimados, flujo mensual, morosidad y cobranza efectiva.',
      ];
    }

    if (tab === 'deudores') {
      return [
        'Fuente: cuotas registradas, socios activos y valores vigentes de categoría.',
        'Criterio: deuda calculada a la fecha de emisión.',
        'Incluye: mes actual si corresponde y meses vencidos impagos.',
      ];
    }

    if (tab === 'recaudacion') {
      return [
        'Fuente: pagos registrados en tesorería.',
        'Criterio: agrupación por período imputado de cobro.',
        `Períodos incluidos: ${monthly.length}.`,
      ];
    }

    return [
      'Fuente: padrón actual de socios.',
      'Criterio: distribución por categoría.',
      'Cálculo adicional: valor unitario multiplicado solo por socios activos.',
    ];
  }

  function pdfStyles() {
    return `
      <style>
        @page { size: A4; margin: 16mm 14mm 18mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.35;
        }
        .page { width: 100%; }
        .header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: start;
          border-bottom: 2px solid #111827;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .institution {
          font-family: Georgia, serif;
          font-size: 20px;
          letter-spacing: 0.08em;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: #4b5563;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .meta-box {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          min-width: 180px;
          font-size: 10px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }
        .meta-row:last-child { margin-bottom: 0; }
        .meta-label { color: #6b7280; }
        .meta-value { font-weight: 700; text-align: right; }
        h1 { font-size: 18px; margin: 0 0 10px; }
        .criteria {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px;
          padding: 10px 12px;
          margin-bottom: 16px;
        }
        .criteria-title {
          font-weight: 700;
          margin-bottom: 6px;
          text-transform: uppercase;
          font-size: 10px;
          color: #374151;
          letter-spacing: 0.05em;
        }
        .criteria ul { margin: 0; padding-left: 16px; }
        .criteria li { margin-bottom: 3px; }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .summary-4 { grid-template-columns: repeat(4, 1fr); }
        .box {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px;
          min-height: 58px;
        }
        .box-label {
          color: #6b7280;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 5px;
        }
        .box-value {
          font-size: 16px;
          font-weight: 800;
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          margin: 18px 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          page-break-inside: auto;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th {
          text-align: left;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          padding: 7px;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        td {
          border: 1px solid #e5e7eb;
          padding: 7px;
          vertical-align: top;
        }
        tfoot td {
          background: #f9fafb;
          font-weight: 800;
        }
        .footer {
          margin-top: 34px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          page-break-inside: avoid;
        }
        .signature {
          padding-top: 34px;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #111827;
          padding-top: 8px;
          font-weight: 700;
        }
        .signature-role {
          margin-top: 3px;
          color: #6b7280;
          font-size: 10px;
        }
        .legal-note {
          margin-top: 24px;
          color: #6b7280;
          font-size: 9px;
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
        }
        .amount { text-align: right; white-space: nowrap; }
        .center { text-align: center; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    `;
  }

  function buildPdfShell(content: string) {
    const emittedAt = new Date();
    const emittedDate = emittedAt.toLocaleDateString('es-AR');
    const emittedTime = emittedAt.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const criteriaRows = reportCriteria()
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle())}</title>
          ${pdfStyles()}
        </head>
        <body>
          <main class="page">
            <header class="header">
              <div>
                <div class="institution">R.·.L.·. PROGRESO Nº 100</div>
                <div class="subtitle">Administración integral</div>
              </div>

              <div class="meta-box">
                <div class="meta-row">
                  <span class="meta-label">Fecha</span>
                  <span class="meta-value">${escapeHtml(emittedDate)}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Hora</span>
                  <span class="meta-value">${escapeHtml(emittedTime)}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Formato</span>
                  <span class="meta-value">A4</span>
                </div>
              </div>
            </header>

            <h1>${escapeHtml(reportTitle())}</h1>

            <section class="criteria">
              <div class="criteria-title">Criterios / filtros del reporte</div>
              <ul>${criteriaRows}</ul>
            </section>

            ${content}

            <section class="footer">
              <div class="signature">
                <div class="signature-line">Firma y aclaración</div>
                <div class="signature-role">Responsable de emisión</div>
              </div>

              <div class="signature">
                <div class="signature-line">Firma y aclaración</div>
                <div class="signature-role">Tesorería / Autoridad competente</div>
              </div>
            </section>

            <div class="legal-note">
              Documento generado desde el sistema de gestión. La información refleja los registros disponibles al momento de emisión.
            </div>
          </main>
        </body>
      </html>
    `;
  }

  function buildFinancialPdfHtml() {
    if (!financial) {
      return buildPdfShell('<p>No hay información financiera disponible.</p>');
    }

    const monthlyRows = financial.monthlyComparison
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.label)}${item.projected ? ' (estimado)' : ''}</td>
            <td class="amount">${escapeHtml(fmt(item.income))}</td>
            <td class="amount">${escapeHtml(fmt(item.expense))}</td>
            <td class="amount">${escapeHtml(fmt(item.net))}</td>
          </tr>
        `,
      )
      .join('');

    const debtorRows = financial.topDebtors
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.fullName)}</td>
            <td>${escapeHtml(item.matricula)}</td>
            <td>${escapeHtml(categoryLabel(item.category))}</td>
            <td class="center">${escapeHtml(item.monthsOwed)}</td>
            <td class="amount">${escapeHtml(fmt(item.totalDebt))}</td>
          </tr>
        `,
      )
      .join('');

    const expectedRows = financial.categoryExpectedCollection
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(categoryLabel(item.category))}</td>
            <td class="center">${escapeHtml(item.activeMembers)}</td>
            <td class="amount">${escapeHtml(fmt(item.unitAmount))}</td>
            <td class="amount">${escapeHtml(fmt(item.expectedTotal))}</td>
          </tr>
        `,
      )
      .join('');

    return buildPdfShell(`
      <section class="summary summary-4">
        <div class="box">
          <div class="box-label">Saldo caja</div>
          <div class="box-value">${fmt(financial.cashBalance)}</div>
        </div>
        <div class="box">
          <div class="box-label">Activos por cobrar</div>
          <div class="box-value">${fmt(financial.accountsReceivable)}</div>
        </div>
        <div class="box">
          <div class="box-label">Pasivos estimados</div>
          <div class="box-value">${fmt(financial.liabilities)}</div>
        </div>
        <div class="box">
          <div class="box-label">% deudores</div>
          <div class="box-value">${fmtPercent(financial.debtorsPercentage)}</div>
        </div>
      </section>

      <section class="summary summary-4">
        <div class="box">
          <div class="box-label">Ingresos de este mes - ${escapeHtml(financial.currentMonth)}</div>
          <div class="box-value">${fmt(financial.monthlyIncome)}</div>
        </div>
        <div class="box">
          <div class="box-label">Egresos de este mes - ${escapeHtml(financial.currentMonth)}</div>
          <div class="box-value">${fmt(financial.monthlyExpenses)}</div>
        </div>
        <div class="box">
          <div class="box-label">Resultado neto</div>
          <div class="box-value">${fmt(financial.monthlyNet)}</div>
        </div>
        <div class="box">
          <div class="box-label">Cobranza efectiva</div>
          <div class="box-value">${fmtPercent(financial.collectionEffectiveness)}</div>
        </div>
      </section>

      <div class="section-title">Recaudación esperada del mes</div>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>HH.·. activos</th>
            <th>Valor unitario</th>
            <th>Esperado</th>
          </tr>
        </thead>
        <tbody>${expectedRows}</tbody>
      </table>

      <div class="section-title">Ingresos vs egresos del último año + proyección 3 meses</div>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Ingresos</th>
            <th>Egresos</th>
            <th>Neto</th>
          </tr>
        </thead>
        <tbody>${monthlyRows}</tbody>
      </table>

      <div class="section-title">Antigüedad de deuda</div>
      <table>
        <thead>
          <tr>
            <th>Rango</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1 mes</td><td class="amount">${fmt(financial.debtAging.oneMonth)}</td></tr>
          <tr><td>2 a 3 meses</td><td class="amount">${fmt(financial.debtAging.twoToThree)}</td></tr>
          <tr><td>4 a 6 meses</td><td class="amount">${fmt(financial.debtAging.fourToSix)}</td></tr>
          <tr><td>Más de 6 meses</td><td class="amount">${fmt(financial.debtAging.overSix)}</td></tr>
        </tbody>
      </table>

      <div class="section-title">Principales deudores</div>
      <table>
        <thead>
          <tr>
            <th>H.·.</th>
            <th>Matrícula</th>
            <th>Categoría</th>
            <th>Meses</th>
            <th>Deuda</th>
          </tr>
        </thead>
        <tbody>${debtorRows}</tbody>
      </table>
    `);
  }

  function buildPdfHtml() {
    if (tab === 'financiero') {
      return buildFinancialPdfHtml();
    }

    if (tab === 'deudores') {
      const rows = debtors
        .map(
          (debtor) => `
            <tr>
              <td>${escapeHtml(debtor.lastName)}, ${escapeHtml(debtor.firstName)}</td>
              <td>${escapeHtml(debtor.matricula)}</td>
              <td>${escapeHtml(categoryLabel(debtor.category))}</td>
              <td>${escapeHtml(debtor.debtLevelLabel)}</td>
              <td class="center">${escapeHtml(debtor.monthsOwed)}</td>
              <td>${escapeHtml(debtor.overdueMonthLabels.join(', ') || '-')}</td>
              <td class="amount">${escapeHtml(fmt(debtor.debt))}</td>
            </tr>
          `,
        )
        .join('');

      return buildPdfShell(`
        <section class="summary">
          <div class="box">
            <div class="box-label">Socios deudores</div>
            <div class="box-value">${debtors.length}</div>
          </div>
          <div class="box">
            <div class="box-label">Deuda total estimada</div>
            <div class="box-value">${fmt(totalDebt)}</div>
          </div>
          <div class="box">
            <div class="box-label">Tipo de reporte</div>
            <div class="box-value">Deudores</div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Socio</th>
              <th>Matrícula</th>
              <th>Categoría</th>
              <th>Nivel deuda</th>
              <th>Meses</th>
              <th>Meses vencidos</th>
              <th>Deuda total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    }

    if (tab === 'recaudacion') {
      const rows = monthly
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.month)}</td>
              <td class="amount">${escapeHtml(fmt(item.total))}</td>
            </tr>
          `,
        )
        .join('');

      return buildPdfShell(`
        <section class="summary">
          <div class="box">
            <div class="box-label">Total recaudado</div>
            <div class="box-value">${fmt(totalCollected)}</div>
          </div>
          <div class="box">
            <div class="box-label">Períodos</div>
            <div class="box-value">${monthly.length}</div>
          </div>
          <div class="box">
            <div class="box-label">Tipo de reporte</div>
            <div class="box-value">Recaudación</div>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Total recaudado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `);
    }

    const categoryRows = categories
      .map(
        (category) => `
          <tr>
            <td>${escapeHtml(categoryLabel(category.category))}</td>
            <td class="center">${escapeHtml(category.active)}</td>
            <td class="center">${escapeHtml(category.inactive)}</td>
            <td class="center">${escapeHtml(category.total)}</td>
          </tr>
        `,
      )
      .join('');

    const projectionRows = categoryCalculationRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(categoryLabel(row.category))}</td>
            <td class="center">${escapeHtml(row.activeMembers)}</td>
            <td class="amount">${escapeHtml(fmt(row.unitValue))}</td>
            <td class="amount">${escapeHtml(fmt(row.totalValue))}</td>
          </tr>
        `,
      )
      .join('');

    return buildPdfShell(`
      <section class="summary">
        <div class="box">
          <div class="box-label">Categorías</div>
          <div class="box-value">${categories.length}</div>
        </div>
        <div class="box">
          <div class="box-label">Total proyección</div>
          <div class="box-value">${fmt(totalCategoryProjection)}</div>
        </div>
        <div class="box">
          <div class="box-label">Tipo de reporte</div>
          <div class="box-value">Categorías</div>
        </div>
      </section>

      <div class="section-title">Socios por categoría</div>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Activos</th>
            <th>Inactivos</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${categoryRows}</tbody>
      </table>

      <div class="section-title">Cálculo por valor unitario</div>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Socios activos</th>
            <th>Valor unitario</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>${projectionRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">Total general</td>
            <td class="amount">${fmt(totalCategoryProjection)}</td>
          </tr>
        </tfoot>
      </table>
    `);
  }

  function downloadPdf() {
    const printWindow = window.open('', '_blank');

    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildPdfHtml());
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          {(['financiero', 'deudores', 'recaudacion', 'categorias'] as const).map(
            (tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setTab(tabKey)}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${
                  tab === tabKey
                    ? 'bg-accent text-white'
                    : 'bg-ink/10 text-ink/70 hover:bg-ink/20'
                }`}
              >
                {tabKey === 'financiero'
                  ? 'Financiero'
                  : tabKey === 'deudores'
                    ? 'Socios deudores'
                    : tabKey === 'recaudacion'
                      ? 'Recaudación'
                      : 'Por categoría'}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={downloadPdf}
          disabled={loading}
          className="rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
        >
          Descargar PDF
        </button>
      </div>

      {loading ? (
        <SectionCard title="Reportes" description="Cargando información">
          <div className="py-8 text-sm text-ink/60">Cargando reportes...</div>
        </SectionCard>
      ) : (
        <>
          {tab === 'financiero' && (
            <SectionCard
              title="Reporte financiero general"
              description="Estado financiero operativo: caja, activos por cobrar, pasivos estimados, morosidad y flujo mensual."
            >
              {!financial ? (
                <div className="py-8 text-sm text-ink/60">
                  No hay información financiera disponible.
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-ink/10 bg-accent/10 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Saldo Caja
                        <InfoHint text="Ingresos registrados menos egresos registrados, excluyendo movimientos anulados." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-accent">
                        {fmt(financial.cashBalance)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Activos por cobrar
                        <InfoHint text="Total de cuotas adeudadas con monto mayor a cero." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {fmt(financial.accountsReceivable)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-rose-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Pasivos estimados
                        
                      </div>
                      <div className="mt-2 text-2xl font-bold text-rose-700">
                        {fmt(financial.liabilities)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Cobranza efectiva
                        <InfoHint text="Recaudación real del mes dividida por la recaudación esperada según HH.·. activos y valor vigente de cuota." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {fmtPercent(financial.collectionEffectiveness)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-ink/10 bg-emerald-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Ingresos de este mes - {financial.currentMonth}
                        <InfoHint text="Ingresos registrados en caja durante el mes en curso." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-emerald-700">
                        {fmt(financial.monthlyIncome)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-rose-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Egresos de este mes - {financial.currentMonth}
                        <InfoHint text="Egresos registrados en caja durante el mes en curso." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-rose-700">
                        {fmt(financial.monthlyExpenses)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Resultado neto mensual
                        <InfoHint text="Ingresos del mes menos egresos del mes." />
                      </div>
                      <div className={`mt-2 text-2xl font-bold ${signedTone(financial.monthlyNet)}`}>
                        {fmt(financial.monthlyNet)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Cobertura de caja
                        <InfoHint text="Saldo de caja dividido por egreso promedio mensual. Indica cuántos meses podría cubrir la caja al ritmo actual." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {financial.monthsOfCoverage === null
                          ? '-'
                          : `${financial.monthsOfCoverage.toFixed(1)} meses`}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        HH.·. activos
                        <InfoHint text="Cantidad de HH.·. con estado activo en el Cuadro del Taller." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {financial.activeMembers}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        HH.·. deudores
                        <InfoHint text="Cantidad de HH.·. activos con deuda monetaria mayor a cero." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {financial.debtorsCount}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Porcentaje deudores
                        <InfoHint text="HH.·. deudores dividido por HH.·. activos, expresado como porcentaje." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {fmtPercent(financial.debtorsPercentage)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-ink/50">
                        Deuda promedio por deudor
                        <InfoHint text="Total de activos por cobrar dividido por cantidad de HH.·. deudores." />
                      </div>
                      <div className="mt-2 text-2xl font-bold text-ink">
                        {fmt(financial.averageDebtPerDebtor)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-1 text-lg font-semibold text-ink">
                        Ingresos vs egresos del último año
                        <InfoHint text="Compara ingresos y egresos de los últimos 12 meses, incluyendo el mes actual. Los 3 meses futuros son estimaciones calculadas con el promedio de los últimos 3 meses reales." />
                      </div>
                      <div className="mb-4 text-sm text-ink/60">
                        Incluye 12 meses reales y una estimación de los próximos 3 meses.
                      </div>

                      <div className="overflow-x-auto">
                        <div className="min-w-[920px]">
                          <div className="flex h-72 items-end gap-3 rounded-2xl border border-ink/10 bg-ink/[0.02] px-4 py-5">
                            {financial.monthlyComparison.map((item) => (
                              <div
                                key={item.period}
                                className={`flex h-full min-w-12 flex-1 flex-col justify-end rounded-2xl px-1 py-2 ${
                                  item.projected ? 'bg-amber-50/70 ring-1 ring-amber-200' : ''
                                }`}
                                title={`${item.label}${item.projected ? ' estimado' : ''} · Ingresos: ${fmt(item.income)} · Egresos: ${fmt(item.expense)} · Neto: ${fmt(item.net)}`}
                              >
                                <div className="flex flex-1 items-end justify-center gap-1">
                                  <div
                                    className={`w-4 rounded-t-lg ${
                                      item.projected ? 'bg-emerald-400/60' : 'bg-emerald-600'
                                    }`}
                                    style={{
                                      height: barWidth(item.income, maxMonthlyValue),
                                      minHeight: item.income > 0 ? '6px' : '0px',
                                    }}
                                  />
                                  <div
                                    className={`w-4 rounded-t-lg ${
                                      item.projected ? 'bg-rose-400/60' : 'bg-rose-600'
                                    }`}
                                    style={{
                                      height: barWidth(item.expense, maxMonthlyValue),
                                      minHeight: item.expense > 0 ? '6px' : '0px',
                                    }}
                                  />
                                </div>

                                <div className="mt-2 text-center text-[10px] font-semibold leading-tight text-ink/70">
                                  {shortMonthLabel(item.label)}
                                </div>
                                {item.projected && (
                                  <div className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                                    Est.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                              <div className="font-semibold">Ingresos</div>
                              <div>Columnas verdes</div>
                            </div>
                            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
                              <div className="font-semibold">Egresos</div>
                              <div>Columnas rojas</div>
                            </div>
                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                              <div className="font-semibold">Estimación</div>
                              <div>Próximos 3 meses</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                              <th className="px-3 py-2">Mes</th>
                              <th className="px-3 py-2">Tipo</th>
                              <th className="px-3 py-2">Ingresos</th>
                              <th className="px-3 py-2">Egresos</th>
                              <th className="px-3 py-2">Neto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financial.monthlyComparison.map((item) => (
                              <tr
                                key={`row-${item.period}`}
                                className={`rounded-2xl text-sm ${
                                  item.projected ? 'bg-amber-50' : 'bg-ink/5'
                                }`}
                              >
                                <td className="rounded-l-2xl px-3 py-3 font-semibold text-ink">
                                  {item.label}
                                </td>
                                <td className="px-3 py-3 text-ink/70">
                                  {item.projected ? 'Estimado' : 'Real'}
                                </td>
                                <td className="px-3 py-3 font-semibold text-emerald-700">
                                  {fmt(item.income)}
                                </td>
                                <td className="px-3 py-3 font-semibold text-rose-700">
                                  {fmt(item.expense)}
                                </td>
                                <td className={`rounded-r-2xl px-3 py-3 font-bold ${signedTone(item.net)}`}>
                                  {fmt(item.net)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-4 text-lg font-semibold text-ink">
                        Antigüedad de deuda
                      </div>

                      <div className="space-y-3">
                        {[
                          ['1 mes', financial.debtAging.oneMonth],
                          ['2 a 3 meses', financial.debtAging.twoToThree],
                          ['4 a 6 meses', financial.debtAging.fourToSix],
                          ['Más de 6 meses', financial.debtAging.overSix],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                          >
                            <span className="text-ink">{label}</span>
                            <span className="font-bold text-ink">
                              {fmt(Number(value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-4 text-lg font-semibold text-ink">
                        Recaudación esperada por categoría
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                              <th className="px-3 py-2">Categoría</th>
                              <th className="px-3 py-2">Activos</th>
                              <th className="px-3 py-2">Valor</th>
                              <th className="px-3 py-2">Esperado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {financial.categoryExpectedCollection.map((item) => (
                              <tr
                                key={item.category}
                                className="rounded-2xl bg-ink/5 text-sm"
                              >
                                <td className="rounded-l-2xl px-3 py-3 text-ink">
                                  {categoryLabel(item.category)}
                                </td>
                                <td className="px-3 py-3 text-ink/80">
                                  {item.activeMembers}
                                </td>
                                <td className="px-3 py-3 text-ink/80">
                                  {fmt(item.unitAmount)}
                                </td>
                                <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                                  {fmt(item.expectedTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-4 text-lg font-semibold text-ink">
                        Principales deudores
                      </div>

                      <div className="space-y-3">
                        {financial.topDebtors.length === 0 ? (
                          <div className="text-sm text-ink/60">
                            No hay deudores.
                          </div>
                        ) : (
                          financial.topDebtors.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 rounded-2xl bg-ink/5 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
                            >
                              <div>
                                <div className="font-semibold text-ink">
                                  {item.fullName}
                                </div>
                                <div className="text-xs text-ink/60">
                                  Matrícula {item.matricula} ·{' '}
                                  {categoryLabel(item.category)} ·{' '}
                                  {item.monthsOwed} meses
                                </div>
                              </div>
                              <div className="font-bold text-ink">
                                {fmt(item.totalDebt)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-4 text-lg font-semibold text-ink">
                        Ingresos por categoría
                      </div>
                      <div className="space-y-3">
                        {financial.categoryIncome.map((item) => (
                          <div
                            key={item.category}
                            className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                          >
                            <span>{incomeLabel(item.category)}</span>
                            <span className="font-bold">{fmt(item.total)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                          <span className="font-bold text-emerald-800">Total ingresos</span>
                          <span className="font-bold text-emerald-800">
                            {fmt(totalIncomeByCategory)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-white p-4">
                      <div className="mb-4 text-lg font-semibold text-ink">
                        Egresos por categoría
                      </div>
                      <div className="space-y-3">
                        {financial.categoryExpense.map((item) => (
                          <div
                            key={item.category}
                            className="flex items-center justify-between rounded-2xl bg-ink/5 px-4 py-3 text-sm"
                          >
                            <span>{expenseLabel(item.category)}</span>
                            <span className="font-bold">{fmt(item.total)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm">
                          <span className="font-bold text-rose-800">Total egresos</span>
                          <span className="font-bold text-rose-800">
                            {fmt(totalExpenseByCategory)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'deudores' && (
            <SectionCard
              title="Socios deudores"
              description="La deuda se recalcula con el valor vigente actual de la categoría que correspondía en cada mes adeudado."
            >
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Total socios deudores
                  </div>
                  <div className="mt-2 text-2xl font-bold text-ink">
                    {debtors.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-ink/10 bg-ink/5 p-4">
                  <div className="text-xs uppercase tracking-wide text-ink/50">
                    Deuda total estimada
                  </div>
                  <div className="mt-2 text-2xl font-bold text-ink">
                    {fmt(totalDebt)}
                  </div>
                </div>
              </div>

              {debtors.length === 0 ? (
                <div className="py-8 text-sm text-ink/60">
                  No hay socios deudores.
                </div>
              ) : (
                <div className="space-y-4">
                  {debtors.map((debtor) => (
                    <div
                      key={debtor.id}
                      className="rounded-2xl border border-ink/10 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-semibold text-ink">
                              {debtor.lastName}, {debtor.firstName}
                            </div>
                            <span className="rounded-xl border border-ink/10 px-2 py-1 text-xs font-semibold text-ink/70">
                              {debtor.matricula}
                            </span>
                            <span
                              className={`rounded-xl border px-2 py-1 text-xs font-semibold ${DEBT_BADGE_STYLES[debtor.debtColor]}`}
                            >
                              {debtor.debtLevelLabel}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Categoría actual:{' '}
                            <span className="font-medium text-ink">
                              {categoryLabel(debtor.category)}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Celular:{' '}
                            <span className="font-medium text-ink">
                              {debtor.phone ?? '-'}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Mes actual adeudado:{' '}
                            <span className="font-medium text-ink">
                              {debtor.owesCurrentMonth ? 'Sí' : 'No'}
                            </span>
                          </div>

                          <div className="text-sm text-ink/70">
                            Meses vencidos impagos:{' '}
                            <span className="font-medium text-ink">
                              {debtor.overdueMonthsCount === 0
                                ? 'Ninguno'
                                : `${debtor.overdueMonthsCount} — ${debtor.overdueMonthLabels.join(', ')}`}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-ink/5 px-4 py-3 text-right">
                          <div className="text-xs uppercase tracking-wide text-ink/50">
                            Deuda total
                          </div>
                          <div className="mt-1 text-2xl font-bold text-ink">
                            {fmt(debtor.debt)}
                          </div>
                          <div className="mt-1 text-sm text-ink/60">
                            {debtor.monthsOwed} mes
                            {debtor.monthsOwed !== 1 ? 'es' : ''} adeudado
                            {debtor.monthsOwed !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'recaudacion' && (
            <SectionCard
              title="Recaudación mensual"
              description="Totales agrupados por período imputado de cobro."
            >
              <div className="mb-6 rounded-2xl border border-ink/10 bg-ink/5 p-4">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  Total recaudado
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {fmt(totalCollected)}
                </div>
              </div>

              {monthly.length === 0 ? (
                <div className="py-8 text-sm text-ink/60">
                  Sin pagos registrados todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                        <th className="px-3 py-2">Mes</th>
                        <th className="px-3 py-2">Total recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((item) => (
                        <tr
                          key={item.month}
                          className="rounded-2xl bg-ink/5 text-sm"
                        >
                          <td className="rounded-l-2xl px-3 py-3 text-ink">
                            {item.month}
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                            {fmt(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {tab === 'categorias' && (
            <SectionCard
              title="Socios por categoría"
              description="Distribución actual de socios activos e inactivos, más cálculo de proyección usando solo socios activos."
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Activos</th>
                      <th className="px-3 py-2">Inactivos</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr
                        key={category.category}
                        className="rounded-2xl bg-ink/5 text-sm"
                      >
                        <td className="rounded-l-2xl px-3 py-3 text-ink">
                          {categoryLabel(category.category)}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {category.active}
                        </td>
                        <td className="px-3 py-3 text-ink/80">
                          {category.inactive}
                        </td>
                        <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                          {category.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-ink">
                    Cálculo por valor unitario
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">
                    Ingresá un valor por categoría y el sistema calculará el
                    producto de ese valor por la cantidad de socios activos de la
                    categoría.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                        <th className="px-3 py-2">Categoría</th>
                        <th className="px-3 py-2">Socios activos</th>
                        <th className="px-3 py-2">Valor unitario</th>
                        <th className="px-3 py-2">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryCalculationRows.map((row) => (
                        <tr
                          key={`calc-${row.category}`}
                          className="rounded-2xl bg-ink/5 text-sm"
                        >
                          <td className="rounded-l-2xl px-3 py-3 text-ink">
                            {categoryLabel(row.category)}
                          </td>
                          <td className="px-3 py-3 text-ink/80">
                            {row.activeMembers}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={categoryValues[row.category] ?? ''}
                              onChange={(e) =>
                                setCategoryValues((prev) => ({
                                  ...prev,
                                  [row.category]: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="rounded-r-2xl px-3 py-3 font-semibold text-ink">
                            {fmt(row.totalValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="text-sm">
                        <td
                          colSpan={3}
                          className="px-3 py-4 text-right font-semibold text-ink"
                        >
                          Total general
                        </td>
                        <td className="px-3 py-4 text-left text-lg font-bold text-accent">
                          {fmt(totalCategoryProjection)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
