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

  json1 = `{
  "name": "Alice",
  "age": 31,
  "address": {
    "city": "India",
    "zip": "SW1A 1AA",
    "home": "DHN",
    "test": [
      {
        "home": "1A",
        "number": 12,
        "address": {
          "city": "London",
          "zip": "SW1A 1AA"
        }
      },
      {
        "home": "1B",
        "number": 14,
        "address": {
          "city": "Dhaka",
          "zip": "SWA 1AA"
        }
      }
    ]
  },
  "phone": "123-456-7890"
}`;

  json2 = `{
  "name": "Alice",
  "age": 30,
  "address": {
    "city": "London",
    "zip": "SW1A 1AA",
    "test": [
      {
        "home": "1A",
        "number": 12,
        "address": {
          "city": "Lon",
          "zip": "SW1A 1AA",
          "ghar": "PNJ"
        }
      },
      {
        "home": "1B",
        "number": 14,
        "address": {
          "city": "Dhaka",
          "zip": "SWA 1AA"
        }
      }
    ]
  },
  "phone": "123-456-78190"
}`;

  highlightedJson1: SafeHtml | null = null;
  highlightedJson2: SafeHtml | null = null;
  differencesWithLines: { path: string; json1Line: number | string; json2Line: number | string }[] = [];
  error: string | null = null;

  constructor(private sanitizer: DomSanitizer) {
    this.json1 = this.formatJson(this.json1);
    this.json2 = this.formatJson(this.json2);
  }

  onInput(event: Event, target: 'json1' | 'json2'): void {
    const element = event.target as HTMLElement;
    if (target === 'json1') {
      // this.json1 = element.innerText;
      this.json1 = this.formatJson(element.innerText);
    } else {
      // this.json2 = element.innerText;
      this.json2 = this.formatJson(element.innerText);
    }
  }

  formatJson(json: string): string {
    try {
      const parsedJson = JSON.parse(json);
      return JSON.stringify(parsedJson, null, 2);
    } catch (e) {
      console.log('Invalid JSON:', e);
      return json; // Return the original string if parsing fails
    }
  }

  compareJSON(): void {
    this.error = null;
    this.differencesWithLines = [];
    try {
      const obj1 = JSON.parse(this.json1);
      const obj2 = JSON.parse(this.json2);

      const differences = deepDiff.diff(obj1, obj2);
      console.log("differences: ", differences);
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

  // mapJsonToLines(json: string): Record<string, number> {
  //   const lines = json.split('\n');
  //   const lineMap: Record<string, number> = {};
  //   const stack: (string | number)[] = [];

  //   lines.forEach((line, index) => {
  //     const trimmedLine = line.trim();
  //     const keyMatch = trimmedLine.match(/^"([^"]+)":/);
  //     const arrayStartMatch = trimmedLine.match(/^\[/);

  //     if (keyMatch) {
  //       const key = keyMatch[1];
  //       const currentPath = stack.length > 0 ? `${stack.join('.')}.${key}` : key;
  //       lineMap[currentPath] = index + 1; // Line numbers are 1-based
  //     }

  //     if (arrayStartMatch && stack.length > 0 && typeof stack[stack.length - 1] === 'number') {
  //       const arrayIndex = stack.pop() as number;
  //       const currentPath = `${stack.join('.')}[${arrayIndex}]`;
  //       lineMap[currentPath] = index + 1;
  //       stack.push(arrayIndex + 1); // Increment array index for the next element
  //     }

  //     if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[')) {
  //       if (keyMatch) {
  //         stack.push(keyMatch[1]);
  //       } else if (trimmedLine.endsWith('[')) {
  //         stack.push(0); // Start array index at 0
  //       }
  //     } else if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {
  //       if (typeof stack[stack.length - 1] === 'number') {
  //         stack.pop(); // Pop array index
  //       }
  //       if (stack.length > 0) {
  //         stack.pop(); // Pop object key or array
  //       }
  //     }
  //   });

  //   console.log("lineMap: ", lineMap);
  //   return lineMap;
  // }

  mapJsonToLines(jsonString: string): Record<string, number> {
    const lines = jsonString.split('\n');
    const result: Record<string, number> = {};
    const stack: (string | number)[] = [];
    const arrayIndexStack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) continue;

      const keyMatch = trimmed.match(/^"([^"]+)"\s*:/);
      const valuePart = keyMatch ? trimmed.slice(trimmed.indexOf(':') + 1).trim() : '';

      const isArrayStart = valuePart === '[' || trimmed.endsWith('[');
      const isObjectStart = valuePart === '{' || trimmed.endsWith('{');
      const isArrayEnd = trimmed.startsWith(']');
      const isObjectEnd = trimmed.startsWith('}');

      if (keyMatch) {
        const key = keyMatch[1];
        const path = [...stack, key].join('.');
        result[path] = i + 1;

        if (isObjectStart) {
          stack.push(key);
        } else if (isArrayStart) {
          stack.push(key);
          arrayIndexStack.push(0);
        }
      } else if (isObjectStart) {
        if (arrayIndexStack.length > 0) {
          const index = arrayIndexStack[arrayIndexStack.length - 1];
          stack.push(index);
          arrayIndexStack[arrayIndexStack.length - 1]++;
        }
      } else if (isObjectEnd) {
        if (typeof stack[stack.length - 1] === 'number') {
          stack.pop(); // pop array index
        } else if (stack.length > 0) {
          stack.pop(); // pop object key
        }
      } else if (isArrayEnd) {
        if (typeof stack[stack.length - 1] === 'string') {
          stack.pop(); // pop array key (e.g., "test")
        }
        arrayIndexStack.pop();
      }
    }

    return result;
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
        console.log("path: ", path);
        const jsonLine = lineMap[path || ''];
        console.log("jsonLine: ", jsonLine);
        console.log("lineNumber: ", lineNumber);

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
        // console.log("DIFF: ", diff.kind)
        // console.log("cssClass: ", cssClass)

      });

      // Debugging logs
      console.log(`Line ${lineNumber}: ${line.trim()} | CSS Class: ${cssClass}`);

      return `<span class="${cssClass}">${line}</span>`;
    });

    return highlightedLines.join('\n');
  }
}