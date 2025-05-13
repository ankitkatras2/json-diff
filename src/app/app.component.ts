import { Component, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as deepDiff from 'deep-diff';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  // json1 = '{\n  "name": "Alice",\n  "age": 30,\n  "address": { "city": "New York", "zip": "10001" }\n}';
  // json2 = '{\n  "name": "Alice",\n  "age": 31,\n  "address": { "city": "London", "zip": "SW1A 1AA" },\n  "phone": "123-456-7890"\n}';
  //
  json1 = `{
    "name": "Alice",
    "age": 31,
    "address": {
        "city": "London",
        "zip": "SW1A 1AA"
    },
    "phone": "123-456-7890"
    }`;
  json2 = `{
    "name": "Alice",
    "age": 30,
    "address": {
        "city": "New York",
        "zip": "10001"
    }
  }`;

  highlightedJson1: SafeHtml | null = null;
  highlightedJson2: SafeHtml | null = null;
  differencesWithLines: { path: string; json1Line: number | string; json2Line: number | string }[] = [];
  error: string | null = null;

  constructor(private sanitizer: DomSanitizer) { }

  onInput(event: Event, target: 'json1' | 'json2'): void {
    const element = event.target as HTMLElement;
    if (target === 'json1') {
      this.json1 = element.innerText;
    } else {
      this.json2 = element.innerText;
    }
  }

  compareJSON(): void {
    this.error = null;
    this.differencesWithLines = [];
    try {
      const obj1 = JSON.parse(this.json1);
      const obj2 = JSON.parse(this.json2);

      const differences = deepDiff.diff(obj1, obj2);
      if (!differences || differences.length === 0) {
        this.highlightedJson1 = this.sanitizer.bypassSecurityTrustHtml(this.json1);
        this.highlightedJson2 = this.sanitizer.bypassSecurityTrustHtml(this.json2);
        return;
      }

      const json1LineMap = this.mapJsonToLines(this.json1);
      const json2LineMap = this.mapJsonToLines(this.json2);

      this.differencesWithLines = differences.map((diff) => {
        const path = diff.path?.join('.') || '';
        return {
          path,
          json1Line: json1LineMap[path] || 'N/A',
          json2Line: json2LineMap[path] || 'N/A'
        };
      });

      this.highlightedJson1 = this.sanitizer.bypassSecurityTrustHtml(
        this.highlightJson(this.json1, differences, json1LineMap, 'json1')
      );
      this.highlightedJson2 = this.sanitizer.bypassSecurityTrustHtml(
        this.highlightJson(this.json2, differences, json2LineMap, 'json2')
      );
    } catch (e: any) {
      this.error = 'Invalid JSON input.';
      this.highlightedJson1 = null;
      this.highlightedJson2 = null;
    }
  }

  mapJsonToLines(json: string): Record<string, number> {
    const lines = json.split('\n');
    const lineMap: Record<string, number> = {};
    const stack: string[] = [];
    let currentPath = '';

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(/^"([^"]+)":/);

      if (match) {
        const key = match[1];
        currentPath = stack.length > 0 ? `${stack.join('.')}.${key}` : key;
        lineMap[currentPath] = index + 1; // Line numbers are 1-based
      }

      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[')) {
        const key = match ? match[1] : '';
        if (key) {
          stack.push(key);
        }
      } else if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
        stack.pop();
      }
    });
    return lineMap;
  }

  highlightJson(
    json: string,
    differences: deepDiff.Diff<any, any>[],
    lineMap: Record<string, number>,
    source: 'json1' | 'json2'
  ): string {
    const lines = json.split('\n');
    const highlightedLines = lines.map((line, index) => {
      const lineNumber = index + 1;
      let cssClass = '';

      differences.forEach((diff) => {
        const path = diff.path?.join('.');
        const jsonLine = lineMap[path || ''];

        if (jsonLine === lineNumber) {
          if (source == 'json1' && diff.kind == 'D') {
            cssClass = 'removed';
          }
          if (source == 'json2' && diff.kind == 'N') {
            cssClass = 'added';
          }
          if (diff.kind == 'E') {
            cssClass = 'edited';
          }
        }
        console.log("DIFF: ", diff.kind)
        console.log("cssClass: ", cssClass)

      });

      // Debugging logs
      console.log(`Line ${lineNumber}: ${line.trim()} | CSS Class: ${cssClass}`);

      return `<span class="${cssClass}">${line}</span>`;
    });

    return highlightedLines.join('\n');
  }
}