import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

const ExcelPreview = ({ workbook, sheetName, zoom = 100, showGridlines = true, onLoad }) => {
    const [sheetData, setSheetData] = useState({
        rows: [],
        cols: [],
        merges: [],
        styles: {},
        images: [],
        hyperlinks: [],
        rowHeights: [],
        colWidths: []
    });
    const [loading, setLoading] = useState(true);
    const containerRef = useRef(null);

    useEffect(() => {
        if (workbook && sheetName) {
            parseSheet();
        }
    }, [workbook, sheetName]);

    const parseSheet = () => {
        setLoading(true);
        
        try {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                setLoading(false);
                return;
            }

            // Parse range
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
            
            // Parse merged cells
            const merges = sheet['!merges'] || [];
            
            // Detect hidden rows/columns
            const hiddenRows = {};
            if (sheet['!rows']) {
                sheet['!rows'].forEach((row, idx) => {
                    if (row?.hidden) hiddenRows[idx] = true;
                });
            }
            const hiddenCols = {};
            if (sheet['!cols']) {
                sheet['!cols'].forEach((col, idx) => {
                    if (col?.hidden) hiddenCols[idx] = true;
                });
            }
            
            const visibleRowIndices = [];
            for (let i = range.s.r; i <= range.e.r; i++) {
                if (!hiddenRows[i]) visibleRowIndices.push(i);
            }
            const visibleColIndices = [];
            for (let i = range.s.c; i <= range.e.c; i++) {
                if (!hiddenCols[i]) visibleColIndices.push(i);
            }
            
            // Parse column widths
            const colWidths = [];
            if (sheet['!cols']) {
                visibleColIndices.forEach(idx => {
                    const col = sheet['!cols'][idx];
                    colWidths.push(col?.wch || (col?.width ? col.width * 7 : 80));
                });
            } else {
                visibleColIndices.forEach(() => {
                    colWidths.push(80);
                });
            }
            
            // Parse row heights
            const rowHeights = [];
            if (sheet['!rows']) {
                visibleRowIndices.forEach(idx => {
                    const row = sheet['!rows'][idx];
                    rowHeights.push(row?.hpt || 20);
                });
            } else {
                visibleRowIndices.forEach(() => {
                    rowHeights.push(24);
                });
            }
            
            // Parse hyperlinks
            const hyperlinks = [];
            if (sheet['!hyperlinks']) {
                sheet['!hyperlinks'].forEach(link => {
                    hyperlinks.push(link);
                });
            }
            
            // Parse data and styles
            const rows = [];
            const styles = {};
            
            visibleRowIndices.forEach(R => {
                const row = [];
                visibleColIndices.forEach(C => {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    const cell = sheet[cellAddress];
                    
                    let value = '';
                    let style = {};
                    
                    if (cell) {
                        value = getCellDisplayValue(cell);
                        
                        if (cell.s) {
                            style = buildCellStyle(cell.s, cell.t);
                        }
                        
                        // Add default numeric alignment if not already set
                        if (cell.t === 'n' && !style.textAlign) {
                            style.textAlign = 'right';
                        }
                        
                        // Highlight FIRM and FORECAST labels if they appear
                        if (value && value.toString().toUpperCase().includes('FIRM')) {
                            style.backgroundColor = '#FFFF00';
                            style.color = '#000000';
                            style.fontWeight = 'bold';
                        } else if (value && value.toString().toUpperCase().includes('FORECAST')) {
                            style.backgroundColor = '#fff3e0';
                            style.color = '#ed6c02';
                            style.fontWeight = 'bold';
                        }

                        // Highlight QTY cells with blue background
                        if (value && value.toString().toUpperCase().includes('QTY')) {
                            style.backgroundColor = '#DBEAFE';
                            style.color = '#1D4ED8';
                            style.fontWeight = 'bold';
                        }
                    }
                    
                    row.push({
                        value,
                        style,
                        raw: cell,
                        address: cellAddress,
                        actualRow: R,
                        actualCol: C
                    });
                });
                rows.push(row);
            });
            
            // Parse images (if any)
            const images = [];
            if (workbook.SheetNames.includes('_rels') || workbook.Sheets[sheetName]['!drawing']) {
                // Note: Full image support requires additional parsing
                // This is a simplified version
            }
            
            setSheetData({
                rows,
                cols: colWidths,
                merges,
                styles,
                images,
                hyperlinks,
                rowHeights,
                colWidths,
                hiddenRows,
                hiddenCols
            });
            
            if (onLoad) onLoad({ rows, colWidths, rowHeights, merges });
            
        } catch (error) {
            console.error('Error parsing sheet:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const getBorderColor = (color) => {
        if (!color) return '#d0d0d0';
        if (color.rgb) return `#${color.rgb}`;
        if (color.theme) return getThemeColor(color.theme);
        return '#d0d0d0';
    };

    const getThemeColor = (theme) => {
        const themeColors = {
            1: '#000000', // Black
            2: '#ffffff', // White
            3: '#ff0000', // Red
            4: '#00ff00', // Green
            5: '#0000ff', // Blue
            6: '#ffff00', // Yellow
            7: '#ff00ff', // Magenta
            8: '#00ffff', // Cyan
        };
        return themeColors[theme] || '#000000';
    };

    const isDateFormat = (format) => {
        if (!format || typeof format !== 'string') return false;
        return /[dyhs]/i.test(format.replace(/\[.*?\]/g, ''));
    };

    const parseExcelDate = (value) => {
        if (typeof value !== 'number') return null;
        try {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (parsed && parsed.y) {
                return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S || 0);
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    const getCellDisplayValue = (cell) => {
        if (!cell) return '';

        if (cell.w !== undefined && cell.w !== null && cell.w !== '') {
            return cell.w;
        }

        if (cell.t === 'd') {
            if (cell.v instanceof Date) {
                return cell.v.toLocaleDateString('id-ID');
            }
            return String(cell.v ?? '');
        }

        if (cell.t === 'n') {
            if (isDateFormat(cell.z)) {
                const date = parseExcelDate(cell.v);
                if (date) {
                    return date.toLocaleDateString('id-ID');
                }
            }
            return cell.v?.toString() ?? '';
        }

        if (cell.t === 'b') {
            return cell.v ? 'TRUE' : 'FALSE';
        }

        return cell.v?.toString() ?? '';
    };

    const buildCellStyle = (styleDefinition, cellType) => {
        const style = {
            fontFamily: styleDefinition.font?.name || 'Calibri',
            fontSize: styleDefinition.font?.sz || 11,
            fontWeight: styleDefinition.font?.bold ? 'bold' : 'normal',
            fontStyle: styleDefinition.font?.italic ? 'italic' : 'normal',
            textDecoration: styleDefinition.font?.underline ? 'underline' : 'none',
            color: styleDefinition.font?.color?.rgb ? `#${styleDefinition.font.color.rgb}` : '#000000',
            backgroundColor: 'transparent',
            textAlign: styleDefinition.alignment?.horizontal || undefined,
            verticalAlign: styleDefinition.alignment?.vertical || 'middle',
            textIndent: styleDefinition.alignment?.indent || 0,
            whiteSpace: styleDefinition.alignment?.wrapText ? 'normal' : 'nowrap',
            wordBreak: styleDefinition.alignment?.wrapText ? 'break-word' : 'normal',
        };

        if (styleDefinition.fill) {
            const fill = styleDefinition.fill;
            const fillColor = fill.fgColor?.rgb || fill.bgColor?.rgb || 
                (fill.fgColor?.theme ? getThemeColor(fill.fgColor.theme) : null) ||
                (fill.bgColor?.theme ? getThemeColor(fill.bgColor.theme) : null);

            if (fill.fgColor?.rgb || fill.bgColor?.rgb || fill.fgColor?.theme || fill.bgColor?.theme) {
                style.backgroundColor = fillColor || 'transparent';
            }
        }

        if (styleDefinition.border) {
            if (styleDefinition.border.top?.style) {
                style.borderTop = `1px solid ${getBorderColor(styleDefinition.border.top.color)}`;
            }
            if (styleDefinition.border.right?.style) {
                style.borderRight = `1px solid ${getBorderColor(styleDefinition.border.right.color)}`;
            }
            if (styleDefinition.border.bottom?.style) {
                style.borderBottom = `1px solid ${getBorderColor(styleDefinition.border.bottom.color)}`;
            }
            if (styleDefinition.border.left?.style) {
                style.borderLeft = `1px solid ${getBorderColor(styleDefinition.border.left.color)}`;
            }
        }

        return style;
    };
    
    const isMerged = (row, col) => {
        return sheetData.merges.some(merge => 
            row >= merge.s.r && row <= merge.e.r &&
            col >= merge.s.c && col <= merge.e.c
        );
    };
    
    const getMergeSpan = (row, col) => {
        const merge = sheetData.merges.find(m => 
            row >= m.s.r && row <= m.e.r &&
            col >= m.s.c && col <= m.e.c
        );
        if (merge && merge.s.r === row && merge.s.c === col) {
            const countVisible = (start, end, hidden) => {
                let count = 0;
                for (let i = start; i <= end; i++) {
                    if (!hidden?.[i]) count++;
                }
                return count;
            };

            return {
                colSpan: countVisible(merge.s.c, merge.e.c, sheetData.hiddenCols),
                rowSpan: countVisible(merge.s.r, merge.e.r, sheetData.hiddenRows)
            };
        }
        return null;
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-[#1D6F42] mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-500">Loading Excel preview...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div 
            ref={containerRef}
            className="excel-preview-container overflow-auto"
            style={{ 
                fontSize: `${zoom / 100 * 12}px`,
                backgroundColor: '#fff',
                maxHeight: '600px',
                minHeight: '400px'
            }}
        >
            <table 
                className="excel-table"
                style={{
                    borderCollapse: 'collapse',
                    fontFamily: '"Segoe UI", "Calibri", "Arial", sans-serif',
                    width: 'max-content',
                    minWidth: '100%'
                }}
            >
                <tbody>
                    {sheetData.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ height: `${sheetData.rowHeights[rowIdx] || 24}px` }}>
                            {row.map((cell, colIdx) => {
                                // Check if cell is merged and should be hidden
                                const mergeSpan = getMergeSpan(cell.actualRow, cell.actualCol);
                                if (!mergeSpan && isMerged(cell.actualRow, cell.actualCol)) {
                                    return null;
                                }
                                
                                const defaultBorder = showGridlines ? '1px solid #d0d0d0' : '1px solid transparent';
                                const style = {
                                    ...cell.style,
                                    border: (cell.style?.borderTop || cell.style?.borderRight || cell.style?.borderBottom || cell.style?.borderLeft)
                                        ? undefined
                                        : defaultBorder,
                                    padding: '4px 8px',
                                    minWidth: `${sheetData.colWidths[colIdx] || 80}px`,
                                    maxWidth: '400px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: cell.style?.whiteSpace || 'nowrap',
                                    wordBreak: cell.style?.wordBreak || 'normal',
                                };
                                
                                return (
                                    <td
                                        key={colIdx}
                                        colSpan={mergeSpan?.colSpan || 1}
                                        rowSpan={mergeSpan?.rowSpan || 1}
                                        style={style}
                                        title={cell.value}
                                    >
                                        {cell.value || '\u00A0'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ExcelPreview;