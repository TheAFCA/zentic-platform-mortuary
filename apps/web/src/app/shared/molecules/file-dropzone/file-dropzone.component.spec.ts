import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FileDropzoneComponent } from './file-dropzone.component';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

describe('FileDropzoneComponent', () => {
  function createFixture() {
    TestBed.configureTestingModule({ imports: [FileDropzoneComponent] });
    const fixture = TestBed.createComponent(FileDropzoneComponent);
    fixture.componentInstance.maxSizeBytes = 2 * 1024 * 1024;
    fixture.detectChanges();
    return fixture;
  }

  it('rejects an unsupported mimetype and does not emit', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.bmp', 'image/bmp', 100);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('Formato de imagen no soportado');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('rejects a file exceeding maxSizeBytes and does not emit', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.png', 'image/png', 3 * 1024 * 1024);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('El archivo excede el máximo de 2 MB');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits fileSelected for a valid file', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('logo.png', 'image/png', 1024);

    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);

    expect(fixture.componentInstance.error()).toBe('');
    expect(emitSpy).toHaveBeenCalledWith(file);
  });
  it('shows the favicon limit in KB before selecting a file', async () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('maxSizeBytes', 512 * 1024);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.file-dropzone__hint').textContent).toContain(
      'Máximo 512 KB',
    );
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    fixture.componentInstance.onFileInputChange({
      target: { files: [makeFile('icon.png', 'image/png', 512 * 1024 + 1)] },
    } as unknown as Event);
    expect(fixture.componentInstance.error()).toBe('El archivo excede el máximo de 512 KB');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('accepts WebP when advertised', () => {
    const fixture = createFixture();
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    const file = makeFile('photo.webp', 'image/webp', 100);
    fixture.componentInstance.onFileInputChange({ target: { files: [file] } } as unknown as Event);
    expect(emitSpy).toHaveBeenCalledWith(file);
  });

  it('uses the per-form accepted types for both selection and validation', () => {
    const fixture = createFixture();
    fixture.componentInstance.acceptedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const emitSpy = vi.spyOn(fixture.componentInstance.fileSelected, 'emit');
    expect(fixture.componentInstance.accept).not.toContain('image/svg+xml');
    fixture.componentInstance.onDrop({
      preventDefault: vi.fn(),
      dataTransfer: { files: [makeFile('photo.svg', 'image/svg+xml', 100)] },
    } as unknown as DragEvent);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
