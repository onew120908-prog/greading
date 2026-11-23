// Google Apps Script - 일일독서기록 수신 및 시트 추가
// 배포: 확장 프로그램 → Apps Script → 붙여넣기 → 배포 → 새 배포(또는 버전 새로 만들기) → 웹 앱
//       실행 계정: 나, 액세스 권한: 모든 사용자

const SPREADSHEET_ID = '1rljeJRdFsKiFutl0G8knjbLmdpPENIA9xhHlX9wGkSE';

function doGet(e) {
  try {
    const p = e.parameter;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 학년 자동 판별
    let grade = '', classNum = '1반';
    if (p.studentCode.startsWith('M1')) grade = '중1';
    else if (p.studentCode.startsWith('M2')) grade = '중2';
    else if (p.studentCode.startsWith('M3')) grade = '중3';

    // 학생 이름: 앱에서 보낸 값 우선, 없으면 학생명단 시트에서 조회
    let studentName = p.studentName || '';
    if (!studentName) {
      const studentSheet = ss.getSheetByName('학생명단');
      const studentData = studentSheet.getRange('C5:D100').getValues();
      for (let i = 0; i < studentData.length; i++) {
        if (studentData[i][0] === p.studentCode) {
          studentName = studentData[i][1];
          break;
        }
      }
    }

    // 같은 학생+사설번호 기존 행 확인 (날짜 무관)
    const recordSheet = ss.getSheetByName('일일기록');
    const existing = recordSheet.getDataRange().getValues();
    let isDuplicate = false;
    for (let i = existing.length - 1; i >= 1; i--) {
      // 시트 열 순서: D(3)=학생코드, E(4)=사설번호
      if (existing[i][3] === p.studentCode && existing[i][4] === p.essayNum) {
        isDuplicate = true;
        recordSheet.deleteRow(i + 1);
      }
    }

    // 사설 정보 조회
    const essaySheet = ss.getSheetByName('사설목록');
    const essayData = essaySheet.getRange('A4:H100').getValues();
    let essayTitle = '', difficulty = '', paraCount = 0, charCount = 0;
    for (let i = 0; i < essayData.length; i++) {
      if (essayData[i][0] === p.essayNum) {
        essayTitle = essayData[i][3];
        difficulty = p.difficulty || essayData[i][5];
        paraCount = Number(essayData[i][6]) || 0;
        const text = String(essayData[i][7] || '');
        charCount = text.replace(/[\s\n\r]/g, '').length;
        break;
      }
    }

    // 자동 계산
    const readMin = Number(p.readMin) || 0;
    const readSec = Number(p.readSec) || 0;
    const writeMin = Number(p.writeMin) || 0;
    const writeSec = Number(p.writeSec) || 0;
    const readingTime = readMin + readSec / 60;
    const writeTime = writeMin + writeSec / 60;
    const circleCount = Number(p.circleCount) || 0;
    const triangleCount = Number(p.triangleCount) || 0;
    const topicScore = Number(p.topicScore) || 0;
    const parScore = paraCount > 0 ? (circleCount * 2 + triangleCount) / (paraCount * 2) * 60 : 0;
    const comprehension = parScore + topicScore;
    const readSpeed = readingTime > 0 ? charCount / readingTime : 0;
    const effectiveSpeed = readSpeed * comprehension / 100;

    // 시트에 행 추가
    recordSheet.appendRow([
      p.date, grade, classNum, p.studentCode, p.essayNum, studentName,
      essayTitle, difficulty, charCount, paraCount,
      readMin, readSec, readingTime.toFixed(2),
      writeMin, writeSec, writeTime.toFixed(2),
      p.reread,
      circleCount, triangleCount, topicScore,
      parScore.toFixed(1), comprehension.toFixed(1),
      readSpeed.toFixed(1), effectiveSpeed.toFixed(1)
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, updated: isDuplicate, studentName, essayTitle }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
