import sys

path = r'c:\Users\abdel\Downloads\DATAFYRA\src\app\components\survey-simulator\survey-simulator.ts'
content = open(path, 'r', encoding='utf-8').read()

correct_block = '''      } @else if (shouldShowWelcome()) {
        <app-survey-welcome-screen
          [survey]="survey"
          [brand]="brand()"
          [questionCount]="survey.questions.length"
          [designMode]="designMode"
          (transformStart)="transformStart.emit($event)"
          (titleChange)="welcomeTitleChange.emit($event)"
          (descriptionChange)="welcomeDescriptionChange.emit($event)"
          (ctaTextChange)="ctaTextChange.emit($event)"
          (extraTextChange)="extraTextChange.emit($event)"
          (deleteRequest)="deleteRequest.emit($event)"
          (start)="startSurvey()">
        </app-survey-welcome-screen>
      } @else if (shouldShowQuestions()) {
        <div class="simulator-progress" aria-hidden="true">
          <div class="simulator-progress-fill" [style.width]="progress() + '%'"></div>'''

marker = '''        </app-survey-thank-you-screen>
      } @else if (shouldShowWelcome()) {
        </div>

        <section class="simulator-question-page"'''

if marker in content:
    content = content.replace(marker, '''        </app-survey-thank-you-screen>\n''' + correct_block + '''\n        </div>\n\n        <section class="simulator-question-page"''')
    open(path, 'w', encoding='utf-8').write(content)
    print("Fixed!")
else:
    print("Marker not found")
