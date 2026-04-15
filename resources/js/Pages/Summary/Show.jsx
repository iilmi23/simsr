import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import {
    ArrowDownTrayIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    CalendarIcon,
    TableCellsIcon,
    ListBulletIcon,
} from "@heroicons/react/24/outline";

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
    if (!d) return "-";
    const p = new Date(d);
    if (isNaN(p.getTime())) return "-";
    return `${p.getMonth() + 1}/${p.getDate()}`;
};

// ─── Excel-Like Pivot Preview ─────────────────────────────────────────────────
function PivotPreview({ data, customer }) {
    // Determine format based on customer
    const isYNAFormat = customer?.toUpperCase() === 'YNA';
    
    // Build sorted unique periods (ETD|ETA pairs)
    const periods = useMemo(() => {
        const map = {};
        data.forEach((item) => {
            const key = `${item.etd}|${item.eta}`;
            if (!map[key]) {
                map[key] = { etd: item.etd, eta: item.eta, etdFmt: fmtDate(item.etd), etaFmt: fmtDate(item.eta) };
            }
        });
        return Object.values(map).sort((a, b) => (a.etd || "").localeCompare(b.etd || ""));
    }, [data]);

    // Group by part_number → { partNumber: { "etd|eta": qty } }
    const grouped = useMemo(() => {
        const g = {};
        data.forEach((item) => {
            const pn = item.part_number || "-";
            if (!g[pn]) g[pn] = { meta: item, qty: {} };
            const key = `${item.etd}|${item.eta}`;
            g[pn].qty[key] = (g[pn].qty[key] || 0) + Number(item.qty || 0);
        });
        // Sort by part_number
        return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data]);

    // Column totals
    const colTotals = useMemo(() => { 
        const totals = {};
        periods.forEach((p) => {
            const key = `${p.etd}|${p.eta}`;
            totals[key] = grouped.reduce((sum, [, v]) => sum + (v.qty[key] || 0), 0);
        });
        return totals;
    }, [periods, grouped]);

    const grandTotal = Object.values(colTotals).reduce((s, v) => s + v, 0);

    if (grouped.length === 0) {
        return <div className="p-8 text-center text-gray-400 text-sm">No data</div>;
    }

    // YNA format: Simple pivot table
    if (isYNAFormat) {
        return (
            <div className="overflow-auto rounded-xl border border-[#b7d9c4]" style={{ maxHeight: "640px" }}>
                <table className="border-collapse text-[11px] font-mono" style={{ minWidth: `${180 + periods.length * 64}px` }}>
                    {/* ── THEAD ── */}
                    <thead>
                        {/* Row 1 — ETD */}
                        <tr>
                            {/* Fixed left cols */}
                            <th
                                rowSpan={2}
                                className="sticky left-0 z-30 border border-[#145233] px-2 py-2 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#1D4D2A", minWidth: 32, top: 0 }}
                            >
                                NO
                            </th>
                            <th
                                rowSpan={2}
                                className="sticky z-30 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#1D4D2A", minWidth: 160, left: 32, top: 0 }}
                            >
                                ASSY NO
                            </th>
                            <th
                                className="sticky z-20 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#1D6F42", left: 192, top: 0, minWidth: 44 }}
                            >
                                ETD
                            </th>
                            {periods.map((p) => (
                                <th
                                    key={`etd-${p.etd}|${p.eta}`}
                                    className="border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                    style={{ background: "#1D6F42", minWidth: 60 }}
                                >
                                    {p.etdFmt}
                                </th>
                            ))}
                            <th
                                className="border border-[#145233] px-2 py-1.5 text-center text-white text-[10px]"
                                style={{ background: "#1D6F42", minWidth: 60 }}
                            >
                                TOTAL
                            </th>
                        </tr>
                        {/* Row 2 — ETA */}
                        <tr>
                            <th
                                className="sticky z-20 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#2E9E5E", left: 192, top: 18, minWidth: 44 }}
                            >
                                ETA
                            </th>
                            {periods.map((p) => (
                                <th
                                    key={`eta-${p.etd}|${p.eta}`}
                                    className="border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                    style={{ background: "#2E9E5E", minWidth: 60 }}
                                >
                                    {p.etaFmt}
                                </th>
                            ))}
                            <th
                                className="border border-[#145233] px-2 py-1.5 text-center text-white text-[10px]"
                                style={{ background: "#2E9E5E", minWidth: 60 }}
                            />
                        </tr>
                    </thead>

                    {/* ── TBODY ── */}
                    <tbody>
                        {grouped.map(([partNumber, { qty }], idx) => {
                            const rowBg = idx % 2 === 0 ? "#EAF5EF" : "#C6E8D4";
                            const rowTotal = periods.reduce((s, p) => s + (qty[`${p.etd}|${p.eta}`] || 0), 0);
                            return (
                                <tr key={partNumber} style={{ background: rowBg }}>
                                    {/* NO */}
                                    <td
                                        className="sticky left-0 z-20 border border-[#334155] px-2 py-1.5 text-center font-bold text-white"
                                        style={{ background: "#2D5A3D", minWidth: 32 }}
                                    >
                                        {idx + 1}
                                    </td>
                                    {/* ASSY NO */}
                                    <td
                                        className="sticky z-20 border border-[#334155] px-3 py-1.5 font-bold text-white truncate"
                                        style={{ background: "#2D5A3D", left: 32, maxWidth: 160 }}
                                        title={partNumber}
                                    >
                                        {partNumber}
                                    </td>
                                    {/* QTY label */}
                                    <td
                                        className="sticky z-20 border border-[#334155] px-2 py-1.5 text-center text-[10px]"
                                        style={{ background: "#3A6B4E", color: "#D4EDE0", left: 192 }}
                                    >
                                        QTY
                                    </td>
                                    {/* Values */}
                                    {periods.map((p) => {
                                        const key = `${p.etd}|${p.eta}`;
                                        const val = qty[key] || 0;
                                        return (
                                            <td
                                                key={key}
                                                className="border px-2 py-1.5 text-right"
                                                style={{
                                                    borderColor: "#8FC9A8",
                                                    color: val === 0 ? "#AABFB0" : "#0D4F2C",
                                                    fontWeight: val === 0 ? 400 : 700,
                                                    background: rowBg,
                                                }}
                                            >
                                                {val.toLocaleString()}
                                            </td>
                                        );
                                    })}
                                    {/* Row Total */}
                                    <td
                                        className="border px-2 py-1.5 text-right font-bold"
                                        style={{ borderColor: "#8FC9A8", color: "#0D4F2C", background: rowBg }}
                                    >
                                        {rowTotal.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* ── TFOOT — TOTAL ROW ── */}
                    <tfoot>
                        <tr>
                            <td
                                className="sticky left-0 z-20 border border-[#2E7D52] px-2 py-2 text-center text-white font-bold"
                                style={{ background: "#0F3320" }}
                            />
                            <td
                                className="sticky z-20 border border-[#2E7D52] px-3 py-2 text-left text-white font-bold"
                                style={{ background: "#0F3320", left: 32 }}
                            >
                                TOTAL
                            </td>
                            <td
                                className="sticky z-20 border border-[#2E7D52] px-2 py-2"
                                style={{ background: "#0F3320", left: 192 }}
                            />
                            {periods.map((p) => {
                                const key = `${p.etd}|${p.eta}`;
                                const val = colTotals[key] || 0;
                                return (
                                    <td
                                        key={key}
                                        className="border border-[#2E7D52] px-2 py-2 text-right font-bold text-white"
                                        style={{ background: "#0F3320" }}
                                    >
                                        {val.toLocaleString()}
                                    </td>
                                );
                            })}
                            <td
                                className="border border-[#2E7D52] px-2 py-2 text-right font-bold text-white"
                                style={{ background: "#0F3320" }}
                            >
                                {grandTotal.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    }

    // Default format: With FIRM/FORECAST groups and TOT columns
    const periodsWithTotals = useMemo(() => {
        const byTypeMonth = {};

        data.forEach((item) => {
            const type = (item.order_type || 'FORECAST').toUpperCase();
            const month = item.month || (item.eta ? new Date(item.eta).toISOString().slice(0, 7) : 'unknown');
            const key = `${item.etd}|${item.eta}|${item.week}`;

            byTypeMonth[type] = byTypeMonth[type] || {};
            byTypeMonth[type][month] = byTypeMonth[type][month] || {};

            if (!byTypeMonth[type][month][key]) {
                byTypeMonth[type][month][key] = {
                    type,
                    month,
                    week: item.week || '',
                    etd: item.etd ? fmtDate(item.etd) : '',
                    eta: item.eta ? fmtDate(item.eta) : '',
                    etd_raw: item.etd || '',
                    eta_raw: item.eta || '',
                };
            }
        });

        const sortedTypes = ['FIRM', 'FORECAST'].filter((t) => byTypeMonth[t]);
        const result = [];

        sortedTypes.forEach((type) => {
            const months = Object.keys(byTypeMonth[type]).sort();
            months.forEach((month) => {
                const periods = Object.values(byTypeMonth[type][month]).sort((a, b) => (a.etd_raw || '').localeCompare(b.etd_raw || ''));
                let weekCount = 0;

                periods.slice(0, 5).forEach((period) => {
                    result.push(period);
                    weekCount += 1;
                });

                while (weekCount < 5) {
                    result.push({
                        type,
                        month,
                        week: `${weekCount + 1}W`,
                        etd: '',
                        eta: '',
                        etd_raw: '',
                        eta_raw: '',
                    });
                    weekCount += 1;
                }

                result.push({
                    type,
                    month,
                    week: 'TOT',
                    etd: '',
                    eta: '',
                    etd_raw: '',
                    eta_raw: '',
                });
            });
        });

        return result;
    }, [data]);

    const groups = useMemo(() => {
        const result = [];
        let current = null;

        periodsWithTotals.forEach((p, idx) => {
            const key = `${p.type}|${p.month}`;
            const colIndex = idx + 4;

            if (!current || current.key !== key) {
                if (current) result.push(current);
                current = { key, type: p.type, start: colIndex, end: colIndex };
            } else {
                current.end = colIndex;
            }
        });

        if (current) result.push(current);
        return result;
    }, [periodsWithTotals]);

    const groupedDefault = useMemo(() => {
        const g = {};
        data.forEach((item) => {
            const pn = item.part_number || '-';
            if (!g[pn]) g[pn] = { qty: {} };
            const key = `${item.etd}|${item.eta}|${item.week}`;
            g[pn].qty[key] = (g[pn].qty[key] || 0) + Number(item.qty || 0);
        });
        return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data]);

    const colTotalsDefault = useMemo(() => {
        const totals = {};
        periodsWithTotals.forEach((p) => {
            if (p.week === 'TOT') return;
            const key = `${p.etd_raw}|${p.eta_raw}|${p.week}`;
            totals[key] = groupedDefault.reduce((sum, [, v]) => sum + (v.qty[key] || 0), 0);
        });
        return totals;
    }, [periodsWithTotals, groupedDefault]);

    return (
        <div className="overflow-auto rounded-xl border border-[#b7d9c4]" style={{ maxHeight: "640px" }}>
            <table className="border-collapse text-[11px] font-mono" style={{ minWidth: `${240 + periodsWithTotals.length * 64}px` }}>
                {/* ── THEAD ── */}
                <thead>
                    {/* Row 1 — Group headers */}
                    <tr>
                        <th
                            rowSpan={4}
                            className="sticky left-0 z-30 border border-[#145233] px-2 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 32, top: 0 }}
                        >
                            NO
                        </th>
                        <th
                            rowSpan={4}
                            className="sticky z-30 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 160, left: 32, top: 0 }}
                        >
                            ASSY NO
                        </th>
                        <th
                            rowSpan={4}
                            className="sticky z-30 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 80, left: 192, top: 0 }}
                        >
                            Order Type
                        </th>
                        {groups.map((group, idx) => (
                            <th
                                key={`group-${idx}`}
                                colSpan={group.end - group.start + 1}
                                className="border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{
                                    background: group.type === 'FIRM' ? '#FFFF00' : '#F4B183',
                                    color: '#000000',
                                }}
                            >
                                {group.type}
                            </th>
                        ))}
                    </tr>
                    {/* Row 2 — ETD */}
                    <tr>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`etd-${idx}`}
                                className="border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#1D6F42', minWidth: 60 }}
                            >
                                {p.week === 'TOT' ? '' : p.etd}
                            </th>
                        ))}
                    </tr>
                    {/* Row 3 — ETA */}
                    <tr>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`eta-${idx}`}
                                className="border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#2E9E5E', minWidth: 60 }}
                            >
                                {p.week === 'TOT' ? '' : p.eta}
                            </th>
                        ))}
                    </tr>
                    {/* Row 4 — Week */}
                    <tr>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`week-${idx}`}
                                className="border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#237A50', minWidth: 60 }}
                            >
                                {p.week}
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* ── TBODY ── */}
                <tbody>
                    {groupedDefault.map(([partNumber, { qty }], idx) => {
                        const rowBg = idx % 2 === 0 ? '#EAF5EF' : '#C6E8D4';
                        return (
                            <tr key={partNumber} style={{ background: rowBg }}>
                                <td
                                    className="sticky left-0 z-20 border border-[#334155] px-2 py-1.5 text-center font-bold text-white"
                                    style={{ background: '#2D5A3D', minWidth: 32 }}
                                >
                                    {idx + 1}
                                </td>
                                <td
                                    className="sticky z-20 border border-[#334155] px-3 py-1.5 font-bold text-white truncate"
                                    style={{ background: '#2D5A3D', left: 32, maxWidth: 160 }}
                                    title={partNumber}
                                >
                                    {partNumber}
                                </td>
                                <td
                                    className="sticky z-20 border border-[#334155] px-3 py-1.5 text-center text-[10px] font-bold"
                                    style={{ background: '#3A6B4E', color: '#D4EDE0', left: 192 }}
                                >
                                    QTY
                                </td>
                                {periodsWithTotals.map((p, idx) => {
                                    const periodKey = `${p.etd_raw}|${p.eta_raw}|${p.week}`;
                                    const val = p.week === 'TOT'
                                        ? Object.keys(qty).reduce((sum, k) => {
                                            const [etdRaw] = k.split('|');
                                            const month = etdRaw ? new Date(etdRaw).toISOString().slice(0, 7) : 'unknown';
                                            return month === p.month ? sum + (qty[k] || 0) : sum;
                                        }, 0)
                                        : (qty[periodKey] || 0);

                                    return (
                                        <td
                                            key={`${periodKey}-${idx}`}
                                            className="border px-2 py-1.5 text-right"
                                            style={{
                                                borderColor: '#8FC9A8',
                                                color: val === 0 ? '#AABFB0' : '#0D4F2C',
                                                fontWeight: val === 0 ? 400 : 700,
                                                background: rowBg,
                                            }}
                                        >
                                            {val.toLocaleString()}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>

                {/* ── TFOOT — TOTAL ROW ── */}
                <tfoot>
                    <tr>
                        <td
                            className="sticky left-0 z-20 border border-[#2E7D52] px-2 py-2 text-center text-white font-bold"
                            style={{ background: "#0F3320" }}
                        />
                        <td
                            className="sticky z-20 border border-[#2E7D52] px-3 py-2 text-left text-white font-bold"
                            style={{ background: "#0F3320", left: 32 }}
                        >
                            TOTAL
                        </td>
                        <td
                            className="sticky z-20 border border-[#2E7D52] px-2 py-2"
                            style={{ background: "#0F3320", left: 192 }}
                        />
                        {periodsWithTotals.map((p) => {
                            const val = p.week === 'TOT'
                                ? groupedDefault.reduce((sum, [, { qty }]) => {
                                    return sum + Object.keys(qty).reduce((monthSum, k) => {
                                        const [etdRaw] = k.split('|');
                                        const month = etdRaw ? new Date(etdRaw).toISOString().slice(0, 7) : 'unknown';
                                        return month === p.month ? monthSum + (qty[k] || 0) : monthSum;
                                    }, 0);
                                }, 0)
                                : groupedDefault.reduce((sum, [, { qty }]) => {
                                    const key = `${p.etd_raw}|${p.eta_raw}|${p.week}`;
                                    return sum + (qty[key] || 0);
                                }, 0);

                            return (
                                <td
                                    key={`total-${p.type}-${p.month}-${p.week}-${p.etd_raw}-${p.eta_raw}`}
                                    className="border border-[#2E7D52] px-2 py-2 text-right font-bold text-white"
                                    style={{ background: "#0F3320" }}
                                >
                                    {val.toLocaleString()}
                                </td>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

// ─── Original List View (unchanged) ──────────────────────────────────────────
function ListView({ filteredData, totalQty, resetFilters, activeFiltersCount }) {
    const formatDate = (date) => {
        if (!date) return "-";
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return "-";
        return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
    };

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            {filteredData.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    <p>No data found</p>
                    {activeFiltersCount > 0 && (
                        <button onClick={resetFilters} className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="p-3 bg-[#f4faf6] border-b border-gray-200 text-sm text-gray-600">
                        Tampilan list detail per baris. Gunakan tab <strong>Excel Preview</strong> untuk tampilan pivot.
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: "620px" }}>
                        <table className="min-w-[1200px] border-collapse border border-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {["No","Product No.","Model","Family","Week","Type","ETD","ETA","Qty","Route","Port","Month"].map((h) => (
                                        <th key={h} className="sticky top-0 z-10 border border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="border border-slate-200 px-3 py-2 text-slate-600">{index + 1}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-800 font-medium">{item.part_number || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.model || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.family || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.week || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                (item.order_type || "").toUpperCase() === "FIRM"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-orange-100 text-orange-700"
                                            }`}>
                                                {item.order_type || "-"}
                                            </span>
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDate(item.etd)}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDate(item.eta)}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">{Number(item.qty || 0).toLocaleString()}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.route || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.port || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.month || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-semibold">
                                <tr>
                                    <td colSpan="8" className="border border-slate-200 px-3 py-2 text-right text-sm text-slate-900">Total Qty</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right text-sm text-slate-900">{totalQty.toLocaleString()}</td>
                                    <td className="border border-slate-200 px-3 py-2" /><td className="border border-slate-200 px-3 py-2" /><td className="border border-slate-200 px-3 py-2" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SummaryShow({ sr, data }) {
    const [searchPartNumber, setSearchPartNumber] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [weekFilter, setWeekFilter] = useState("");
    const [viewMode, setViewMode] = useState("excel"); // "excel" | "list"

    const handleBack = () => router.get("/summary");

    const filteredData = useMemo(() => {
        let filtered = [...data];

        if (searchPartNumber)
            filtered = filtered.filter((i) => i.part_number?.toLowerCase().includes(searchPartNumber.toLowerCase()));

        if (orderTypeFilter)
            filtered = filtered.filter((i) => (i.order_type || "").toUpperCase() === orderTypeFilter.toUpperCase());

        if (startDate && endDate) {
            filtered = filtered.filter((i) => {
                const etdOk = i.etd && i.etd >= startDate && i.etd <= endDate;
                const etaOk = i.eta && i.eta >= startDate && i.eta <= endDate;
                return etdOk || etaOk;
            });
        } else if (startDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd >= startDate) || (i.eta && i.eta >= startDate));
        } else if (endDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd <= endDate) || (i.eta && i.eta <= endDate));
        }

        if (weekFilter) filtered = filtered.filter((i) => i.week === weekFilter);

        const parseWeek = (w) => { const m = (w || "").toString().match(/(\d+)/); return m ? Number(m[1]) : 0; };
        const typeRank  = (t) => { const u = (t || "").toUpperCase(); return u === "FIRM" ? 0 : u === "FORECAST" ? 1 : 2; };

        return filtered.sort((a, b) => {
            const pn = (a.part_number || "").localeCompare(b.part_number || "", undefined, { numeric: true });
            if (pn !== 0) return pn;
            const tr = typeRank(a.order_type) - typeRank(b.order_type);
            if (tr !== 0) return tr;
            const wr = parseWeek(a.week) - parseWeek(b.week);
            if (wr !== 0) return wr;
            return (a.etd || "").localeCompare(b.etd || "");
        });
    }, [data, searchPartNumber, orderTypeFilter, startDate, endDate, weekFilter]);

    const totalQty         = filteredData.reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalFirmQty     = filteredData.filter((i) => (i.order_type || "").toUpperCase() === "FIRM").reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalForecastQty = filteredData.filter((i) => (i.order_type || "").toUpperCase() === "FORECAST").reduce((s, i) => s + Number(i.qty || 0), 0);
    const originalTotalItems = data.length;
    const originalTotalQty   = data.reduce((s, i) => s + Number(i.qty || 0), 0);

    const resetFilters = () => { setSearchPartNumber(""); setOrderTypeFilter(""); setStartDate(""); setEndDate(""); setWeekFilter(""); };

    const activeFiltersCount = [searchPartNumber, orderTypeFilter, startDate, endDate, weekFilter].filter(Boolean).length;

    const uniqueWeeks = useMemo(() => {
        const pW = (w) => { const m = (w || "").toString().match(/(\d+)/); return m ? Number(m[1]) : 0; };
        return [...new Set(data.map((i) => i.week).filter(Boolean))].sort((a, b) => pW(a) - pW(b));
    }, [data]);

    return (
        <AdminLayout title="Summary Detail">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <button onClick={handleBack} className="hover:text-gray-900">Summary</button>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">Detail</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <button onClick={handleBack} className="text-[#1D6F42] hover:text-green-800 mb-2 inline-flex items-center gap-1 text-sm">
                                    ← Back to Summary List
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Summary Detail — {sr.source_file || sr.sr_number}
                                </h1>
                                <div className="text-sm text-gray-500 mt-1">
                                    Customer: {sr.customer} | Port: {sr.port || "-"} | Sheet: {sr.sheet_name || "-"} | Month: {sr.month || "-"} | Upload: {new Date(sr.upload_date).toLocaleString()}
                                </div>
                            </div>
                            <a
                                href={`/summary/${sr.id}/export`}
                                className="bg-[#1D6F42] text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center gap-2 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Export Excel</span>
                            </a>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Filter Section */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-56">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Product No.</label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Product No. or Assy No...."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        value={searchPartNumber}
                                        onChange={(e) => setSearchPartNumber(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={orderTypeFilter}
                                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="FIRM">FIRM</option>
                                    <option value="FORECAST">FORECAST</option>
                                </select>
                            </div>

                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={weekFilter}
                                    onChange={(e) => setWeekFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {uniqueWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>

                            <div className="flex-1 min-w-[320px]">
                                <label className="block text-xs font-medium text-gray-700 mb-1">ETD / ETA Range</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>
                                    <span className="text-gray-400 self-center">-</span>
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {activeFiltersCount > 0 && (
                                <button onClick={resetFilters} className="h-10 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1" title="Reset filters">
                                    <XMarkIcon className="w-5 h-5" />
                                    <span className="text-sm">Reset</span>
                                </button>
                            )}
                        </div>

                        {/* Active filter badges */}
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-xs text-gray-500">Active filters:</span>
                                {searchPartNumber && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Product: {searchPartNumber}</span>}
                                {orderTypeFilter  && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{orderTypeFilter}</span>}
                                {weekFilter       && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Week: {weekFilter}</span>}
                                {(startDate || endDate) && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Date: {startDate || "..."} - {endDate || "..."}</span>}
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { label: "Items",    value: filteredData.length,              orig: originalTotalItems },
                                { label: "Total Qty",value: totalQty.toLocaleString(),        orig: originalTotalQty.toLocaleString(), rawMatch: totalQty === originalTotalQty },
                                { label: "FIRM",     value: totalFirmQty.toLocaleString(),    orig: null },
                                { label: "FORECAST", value: totalForecastQty.toLocaleString(), orig: null },
                            ].map(({ label, value, orig, rawMatch }) => (
                                <div key={label} className="rounded-xl bg-[#f4fbf6] border border-[#d7efdd] p-4">
                                    <div className="text-xs uppercase tracking-wide text-[#1D6F42]">{label}</div>
                                    <div className="text-2xl font-semibold text-gray-900">{value}</div>
                                    {orig !== null && rawMatch === false && (
                                        <div className="text-xs text-gray-400 mt-1">of {typeof orig === "number" ? orig : orig}</div>
                                    )}
                                    {orig !== null && typeof rawMatch === "undefined" && filteredData.length !== originalTotalItems && (
                                        <div className="text-xs text-gray-400 mt-1">of {orig}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 mr-1">View:</span>
                            <button
                                onClick={() => setViewMode("excel")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === "excel"
                                        ? "bg-[#1D6F42] text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <TableCellsIcon className="w-4 h-4" />
                                Excel Preview
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === "list"
                                        ? "bg-[#1D6F42] text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <ListBulletIcon className="w-4 h-4" />
                                List Detail
                            </button>
                        </div>

                        {/* Table */}
                        {viewMode === "excel" ? (
                            <PivotPreview data={filteredData} customer={sr.customer} />
                        ) : (
                            <ListView
                                filteredData={filteredData}
                                totalQty={totalQty}
                                resetFilters={resetFilters}
                                activeFiltersCount={activeFiltersCount}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}