import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

const ACCEPTED_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
};

@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './file-dropzone.component.html',
  styleUrl: './file-dropzone.component.scss',
})
export class FileDropzoneComponent {
  @Input() label = 'Subir archivo';
  @Input() hint = 'PNG, JPG o SVG';
  @Input() maxSizeBytes = 2 * 1024 * 1024;
  @Input() previewUrl: string | null = null;
  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  readonly dragging = signal(false);
  readonly localPreview = signal<string | null>(null);
  readonly error = signal('');

  get accept(): string {
    return Object.keys(ACCEPTED_MIME_EXTENSIONS).join(',');
  }

  openFileBrowser(): void {
    this.fileInput?.nativeElement.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  onFileInputChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
  }

  private handleFile(file: File): void {
    this.error.set('');

    if (!ACCEPTED_MIME_EXTENSIONS[file.type]) {
      this.error.set('Formato no soportado. Use PNG, JPG o SVG');
      return;
    }
    if (file.size > this.maxSizeBytes) {
      const maxMb = Math.round(this.maxSizeBytes / (1024 * 1024));
      this.error.set(`El archivo excede el máximo de ${maxMb}MB`);
      return;
    }

    this.localPreview.set(URL.createObjectURL(file));
    this.fileSelected.emit(file);
  }
}
