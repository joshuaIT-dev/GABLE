/* Shared university-paper formatting for existing Word exports. */
window.GableDocs = {
  timestamp() {
    return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' }).format(new Date()) + ' PHT';
  },
  table(headers, rows, landscape = false) {
    const d = window.docx;
    const width = landscape ? 12960 : 9360;
    const columnWidths = headers.map((_, i) => Math.floor(width / headers.length) + (i < width % headers.length ? 1 : 0));
    const border = { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
    return new d.Table({ width: { size: width, type: d.WidthType.DXA }, columnWidths, layout: d.TableLayoutType.FIXED,
      rows: [headers, ...rows].map((row, index) => new d.TableRow({ tableHeader: index === 0, cantSplit: true,
        children: headers.map((_, col) => new d.TableCell({ width: { size: columnWidths[col], type: d.WidthType.DXA },
          borders: { top: border, bottom: border, left: border, right: border },
          margins: { top: 90, bottom: 90, left: 110, right: 110 },
          shading: { fill: index === 0 ? 'E8EDF3' : 'FFFFFF' },
          children: [new d.Paragraph({ spacing: { after: 0, line: 240 }, children: [new d.TextRun({ text: String(row[col] ?? '?'), font: 'Times New Roman', size: landscape ? 20 : 22, bold: index === 0, color: '111111' })] })]
        }))
      }))
    });
  },
  create(children, title, landscape = false) {
    const d = window.docx;
    const width = landscape ? 12960 : 9360;
    const clearBorder = { style: d.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const borders = { top: clearBorder, bottom: clearBorder, left: clearBorder, right: clearBorder };
    const logo = new d.Table({ width: { size: width, type: d.WidthType.DXA }, columnWidths: [600, width - 600], borders: { ...borders, insideHorizontal: clearBorder, insideVertical: clearBorder },
      rows: [new d.TableRow({ children: [
        new d.TableCell({ borders, width: { size: 600, type: d.WidthType.DXA }, shading: { fill: '152C49' }, verticalAlign: d.VerticalAlign.CENTER, children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { after: 0 }, children: [new d.TextRun({ text: 'G', font: 'Arial', size: 30, bold: true, color: 'FFFFFF' })] })] }),
        new d.TableCell({ borders, width: { size: width - 600, type: d.WidthType.DXA }, margins: { left: 180 }, children: [new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: 'GABLE', font: 'Arial', size: 24, bold: true, color: '152C49' })] }), new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: 'Game Based Learning Environment', size: 18, color: '444444' })] })] })
      ] })]
    });
    return new d.Document({ title, creator: 'GABLE', styles: { default: { document: { run: { font: 'Times New Roman', size: 24, color: '111111' }, paragraph: { spacing: { after: 120, line: 276 } } } }, paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 36, bold: true, color: '000000' }, paragraph: { spacing: { before: 180, after: 180 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { size: 28, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { size: 24, bold: true, color: '000000' }, paragraph: { spacing: { before: 180, after: 100 }, keepNext: true } }
    ] }, sections: [{ properties: { page: { size: { width: 12240, height: 15840, orientation: landscape ? d.PageOrientation.LANDSCAPE : d.PageOrientation.PORTRAIT }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 500, footer: 720 } } },
      headers: { default: new d.Header({ children: [logo] }) },
      footers: { default: new d.Footer({ children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: 'GABLE  |  ' + title + '  |  Page ', size: 18 }), new d.TextRun({ children: [d.PageNumber.CURRENT], size: 18 }), new d.TextRun({ text: ' of ', size: 18 }), new d.TextRun({ children: [d.PageNumber.TOTAL_PAGES], size: 18 })] })] }) },
      children
    }] });
  }
};
