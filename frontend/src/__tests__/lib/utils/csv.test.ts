import { escapeCSVField, toCSV, downloadCSV } from '@/lib/utils/csv';

describe('CSV Utilities', () => {
    describe('escapeCSVField', () => {
        it('returns simple strings unchanged', () => {
            expect(escapeCSVField('hello')).toBe('hello');
            expect(escapeCSVField('test123')).toBe('test123');
            expect(escapeCSVField(42)).toBe('42');
        });

        it('wraps fields with commas in quotes', () => {
            expect(escapeCSVField('hello, world')).toBe('"hello, world"');
            expect(escapeCSVField('one,two,three')).toBe('"one,two,three"');
        });

        it('wraps fields with newlines in quotes', () => {
            expect(escapeCSVField('line1\nline2')).toBe('"line1\nline2"');
            expect(escapeCSVField('multi\nline\ntext')).toBe('"multi\nline\ntext"');
        });

        it('wraps fields with quotes and escapes internal quotes', () => {
            expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""');
            expect(escapeCSVField('"quoted"')).toBe('"""quoted"""');
        });

        it('handles complex cases with multiple special characters', () => {
            expect(escapeCSVField('He said, "Hello,\nWorld"')).toBe('"He said, ""Hello,\nWorld"""');
        });

        it('handles null and undefined as empty strings', () => {
            expect(escapeCSVField(null)).toBe('');
            expect(escapeCSVField(undefined)).toBe('');
        });

        it('handles empty strings', () => {
            expect(escapeCSVField('')).toBe('');
        });

        it('converts numbers to strings', () => {
            expect(escapeCSVField(0)).toBe('0');
            expect(escapeCSVField(123.45)).toBe('123.45');
            expect(escapeCSVField(-999)).toBe('-999');
        });
    });

    describe('toCSV', () => {
        it('converts simple data to CSV', () => {
            const headers = ['Name', 'Age', 'City'];
            const rows = [
                ['John', 30, 'New York'],
                ['Jane', 25, 'London'],
            ];
            const expected = 'Name,Age,City\nJohn,30,New York\nJane,25,London';
            expect(toCSV(headers, rows)).toBe(expected);
        });

        it('handles empty rows', () => {
            const headers = ['Name', 'Age'];
            const rows: (string | number)[][] = [];
            const expected = 'Name,Age';
            expect(toCSV(headers, rows)).toBe(expected);
        });

        it('escapes special characters in headers and data', () => {
            const headers = ['Name', 'Comment'];
            const rows = [
                ['John Doe', 'Said "hello, world"'],
            ];
            const expected = 'Name,Comment\nJohn Doe,"Said ""hello, world"""';
            expect(toCSV(headers, rows)).toBe(expected);
        });

        it('handles null and undefined values', () => {
            const headers = ['Name', 'Email', 'Phone'];
            const rows = [
                ['John', null, undefined],
                ['Jane', 'jane@example.com', '555-1234'],
            ];
            const expected = 'Name,Email,Phone\nJohn,,\nJane,jane@example.com,555-1234';
            expect(toCSV(headers, rows)).toBe(expected);
        });

        it('handles multiline data', () => {
            const headers = ['Title', 'Description'];
            const rows = [
                ['Task 1', 'Line 1\nLine 2\nLine 3'],
            ];
            const expected = 'Title,Description\nTask 1,"Line 1\nLine 2\nLine 3"';
            expect(toCSV(headers, rows)).toBe(expected);
        });
    });

    describe('downloadCSV', () => {
        let mockCreateElement: jest.SpyInstance;
        let mockAppendChild: jest.SpyInstance;
        let mockRemoveChild: jest.SpyInstance;
        let mockClick: jest.Mock;
        let originalCreateObjectURL: typeof URL.createObjectURL;
        let originalRevokeObjectURL: typeof URL.revokeObjectURL;

        beforeEach(() => {
            // Mock DOM methods
            mockClick = jest.fn();
            const mockLink = {
                href: '',
                download: '',
                click: mockClick,
            } as unknown as HTMLAnchorElement;

            mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
            mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
            mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

            // Mock URL methods (can't use jest.spyOn due to JSDOM limitations)
            originalCreateObjectURL = URL.createObjectURL;
            originalRevokeObjectURL = URL.revokeObjectURL;
            URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
            URL.revokeObjectURL = jest.fn();
        });

        afterEach(() => {
            mockCreateElement.mockRestore();
            mockAppendChild.mockRestore();
            mockRemoveChild.mockRestore();
            URL.createObjectURL = originalCreateObjectURL;
            URL.revokeObjectURL = originalRevokeObjectURL;
        });

        it('creates a blob with correct content and type', () => {
            const content = 'Name,Age\nJohn,30';
            const filename = 'test-file';

            downloadCSV(content, filename);

            // Verify blob was created with correct content
            const createObjectURLMock = URL.createObjectURL as jest.Mock;
            const blobCalls = createObjectURLMock.mock.calls;
            expect(blobCalls.length).toBe(1);
            const blob = blobCalls[0][0] as Blob;
            expect(blob.type).toBe('text/csv;charset=utf-8;');
        });

        it('creates link with correct download filename', () => {
            const content = 'test content';
            const filename = 'my-data';

            downloadCSV(content, filename);

            const link = mockCreateElement.mock.results[0].value;
            expect(link.download).toBe('my-data.csv');
        });

        it('triggers download and cleans up', () => {
            const content = 'test content';
            const filename = 'test';

            downloadCSV(content, filename);

            expect(mockCreateElement).toHaveBeenCalledWith('a');
            expect(mockAppendChild).toHaveBeenCalled();
            expect(mockClick).toHaveBeenCalled();
            expect(mockRemoveChild).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        });

        it('sets href to blob URL', () => {
            const content = 'test content';
            const filename = 'test';

            downloadCSV(content, filename);

            const link = mockCreateElement.mock.results[0].value;
            expect(link.href).toBe('blob:mock-url');
        });
    });
});
