import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  BRAND_IMAGE_MIME_TYPES,
  IMAGE_UPLOAD_LIMITS,
  formatUploadSize,
} from '@zentic/shared-types';

@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './file-dropzone.component.html',
  styleUrl: './file-dropzone.component.scss',
})
export class FileDropzoneComponent implements OnDestroy {
  @Input() label = 'Subir archivo';
  @Input() hint = 'PNG, JPG, WebP o SVG';
  @Input() acceptedMimeTypes: readonly string[] = BRAND_IMAGE_MIME_TYPES;
  @Input() maxSizeBytes: number = IMAGE_UPLOAD_LIMITS.logo;
  @Input() previewUrl: string | null = null;
  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  readonly dragging = signal(false);
  readonly localPreview = signal<string | null>(null);
  readonly error = signal('');

  get accept(): string {
    return this.acceptedMimeTypes.join(',');
  }

  get maxSizeLabel(): string {
    return formatUploadSize(this.maxSizeBytes);
  }

  ngOnDestroy(): void {
    this.clearLocalPreview();
  }

  private clearLocalPreview(): void {
    const previous = this.localPreview();
    if (previous) URL.revokeObjectURL(previous);
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

    if (!this.acceptedMimeTypes.includes(file.type)) {
      this.error.set('Formato de imagen no soportado');
      return;
    }
    if (file.size > this.maxSizeBytes) {
      this.error.set(`El archivo excede el máximo de ${this.maxSizeLabel}`);
      return;
    }

    if (file.size === 0) {
      this.error.set('El archivo está vacío');
      return;
    }
    this.clearLocalPreview();
    this.localPreview.set(URL.createObjectURL(file));
    this.fileSelected.emit(file);
  }
}
