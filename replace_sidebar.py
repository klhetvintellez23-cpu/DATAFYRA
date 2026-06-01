import sys
import os

html_path = 'src/app/pages/editor/editor.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '          <div class="custom-nav-bar" aria-label="Herramientas del editor">'
end_str = '\n        </aside>\n'

start_idx = content.find(start_str)
if start_idx == -1:
    print("Start string not found")
    sys.exit(1)

# Find the exact </aside> after start_str
end_idx = content.find(end_str, start_idx)
if end_idx == -1:
    print("End string not found")
    sys.exit(1)

new_content = """          <div class="custom-panel" style="width: 100%; border: none; flex: 1;">
            <div class="custom-panel-header">
              <div>
                <span class="custom-panel-eyebrow">Ajustes visuales</span>
                <h3>Apariencia</h3>
              </div>
            </div>
            <div class="custom-panel-content">
              <div class="subtab-panel">
                <div class="right-section">
                  <div class="right-section-label">Personalización</div>
                  
                  <div class="right-section">
                    <span class="setting-label">Fondo</span>
                    <div class="design-image-row">
                      <input type="file" id="upload-background-image" accept="image/*" (change)="onBackgroundImageSelected($event)" style="display:none" />
                      @if (brand().backgroundImageUrl) {
                        <button class="upload-btn" type="button" (click)="triggerFileInput('upload-background-image')">Cambiar fondo</button>
                        <button class="upload-btn upload-btn-danger" type="button" (click)="removeBackgroundImage()">Eliminar fondo</button>
                      } @else {
                        <button class="upload-btn" type="button" (click)="triggerFileInput('upload-background-image')">
                          <span class="material-symbols-outlined">add</span> Subir imagen de fondo
                        </button>
                      }
                    </div>
                    @if (brand().backgroundImageUrl) {
                      <label class="slider-control">
                        <span>Opacidad de fondo: {{ brand().backgroundOpacity ?? 1 }}</span>
                        <input type="range" min="0" max="1" step="0.05" [ngModel]="brand().backgroundOpacity ?? 1" (ngModelChange)="updateBackgroundOpacity($event)" />
                      </label>
                    }
                  </div>

                  <div class="right-section">
                    <span class="setting-label">Logo</span>
                    <div class="design-image-row">
                      <input type="file" id="upload-logo" accept="image/*" (change)="onLogoSelected($event)" style="display:none" />
                      @if (brand().logoUrl) {
                        <button class="upload-btn" type="button" (click)="triggerFileInput('upload-logo')">Cambiar logo</button>
                        <button class="upload-btn upload-btn-danger" type="button" (click)="removeLogo()">Eliminar logo</button>
                      } @else {
                        <button class="upload-btn" type="button" (click)="triggerFileInput('upload-logo')">
                          <span class="material-symbols-outlined">add</span> Subir logo
                        </button>
                      }
                    </div>
                    @if (brand().logoUrl) {
                      <label class="slider-control">
                        <span>Tamaño logo: {{ brandLogoConfig().width }}px</span>
                        <input type="range" min="60" max="220" [ngModel]="brandLogoConfig().width" (ngModelChange)="updateLogoSize($event)" />
                      </label>
                    }
                  </div>
                </div>
                
                <div class="right-section">
                  <div class="right-section-label">Colores</div>
                  <label class="design-color-picker">
                    <span>Color de fondo</span>
                    <input type="color" [ngModel]="brand().backgroundColor" (ngModelChange)="updateBrandColor('backgroundColor', $event)" />
                  </label>
                  <label class="design-color-picker">
                    <span>Color de texto</span>
                    <input type="color" [ngModel]="brand().textColor" (ngModelChange)="updateBrandColor('textColor', $event)" />
                  </label>
                  <label class="design-color-picker">
                    <span>Color de botones</span>
                    <input type="color" [ngModel]="brand().primaryColor" (ngModelChange)="updateBrandColor('primaryColor', $event)" />
                  </label>
                  <label class="design-color-picker">
                    <span>Color de enlaces</span>
                    <input type="color" [ngModel]="brand().secondaryColor" (ngModelChange)="updateBrandColor('secondaryColor', $event)" />
                  </label>
                </div>
              </div>
            </div>
          </div>
"""

# The replacement should replace everything between start_idx and end_idx.
# And we also want to remove the `          </div>\n          }\n` that might be right before end_str in the original file, 
# because we completely replace the tools menu content.
# Actually, the original file has:
#           </div>
#           }
#         </aside>
# We can just replace everything from `start_idx` up to `end_idx` with `new_content`.
# Then append `content[end_idx:]` (which starts with `\n        </aside>\n`).
final_content = content[:start_idx] + new_content + content[end_idx:]

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Replacement successful")
