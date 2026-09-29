# 권준 · Company Workbench

기업별 공개 직무·제품 맥락에서 고른 문제를 직접 조작하고 검증할 수 있도록 만든 여섯 개의 웹 작업 표본입니다. 입력을 바꾸면 계산·검사 결과가 달라지고, 현재 입력에 연결된 근거 파일을 내려받을 수 있습니다.

**[실행 사이트 열기](https://kwon-work-49mnyp.v2.appdeploy.ai/)** · [권준 GitHub](https://github.com/estona815) · [검증 기록](docs/RELEASE_REPORT.md)

## 기업별 바로가기

회사에 공유할 때는 아래 전용 주소를 사용하면 해당 과제의 작업 화면이 바로 열립니다. 화면의 **과제와 설계**, **검증과 출처**에서 선택 이유와 구현 범위를 확인할 수 있습니다.

| 기업 · 지원 직무 맥락 | 작업 표본 | 직접 확인할 동작 | 내보내기 |
| --- | --- | --- | --- |
| WINDLY · 어베어 / AI Product Builder 인턴 | [AdSpec](https://kwon-work-49mnyp.v2.appdeploy.ai/#/windly) | 광고 설정의 규칙별 검사, 버전 비교, 수정 적용, 입력 변경 시 검토 기록 무효화 | JSON 검사 보고서 |
| INTERX · 인터엑스 / AX Coordinator 인턴 | [FlowMap](https://kwon-work-49mnyp.v2.appdeploy.ai/#/interx) | 단계·승인·권한 검사, 중복 실행 방지와 재시도 재현, 가정이 드러나는 시간 계산 | Markdown·JSON 실행 근거 |
| DOCENTY · 도슨티 / AI-native Builder (PO) | [BriefLedger](https://kwon-work-49mnyp.v2.appdeploy.ai/#/docenty) | 요구사항과 정상·오류·권한 시나리오 연결, 9개 구조 검사, 현재 브리프 검토 | Markdown 브리프·JSON 검사 근거 |
| ENSAPIA · 엔세이피아 / AI·AX Engineer 인턴 | [AvatarOps](https://kwon-work-49mnyp.v2.appdeploy.ai/#/ensapia) | 사용자 범위·승인 순서·중복 적용 등 9개 규칙 검사, 동일 조건의 기준·후보 비교 | JSON 비교 보고서 |
| VIBERS · 바이버스 / AI Product Engineer | [StockBridge](https://kwon-work-49mnyp.v2.appdeploy.ai/#/vibers) | 실제 CSV 입력, 열 연결, SKU·지역별 재고 대조, 중복 보류, 원본 행 추적 | CSV 행별 결과·JSON 대사 근거 |
| WISEWIRES · 와이즈와이어즈 / SQA 신입 | [FaultLab](https://kwon-work-49mnyp.v2.appdeploy.ai/#/wisewires) | 6개 결함·수정 함수를 같은 입력과 독립된 업무 규칙으로 비교, 경계값 변경 | Markdown·JSON 재현 보고서 |

직무 이름은 작업 표본을 설계할 때 참고한 공개 공고의 맥락입니다. 해당 기업의 의뢰·내부 요구사항·채용 확약을 의미하지 않습니다.

## 3분 검토 흐름

1. 회사별 링크에서 초기 예제를 실행하고 실패 항목의 입력·규칙·근거를 확인합니다.
2. 완성 예제를 불러오거나 입력을 직접 바꿔 다시 실행합니다. 이전 결과와 검토 기록이 현재 입력에 계속 유효한지 확인합니다.
3. 결과 파일을 내려받아 화면의 관측값과 비교합니다. **검증과 출처**에서 공개 자료와 구현 한계를 함께 확인합니다.

제품별로 특히 확인하기 좋은 지점은 다음과 같습니다.

- **AdSpec:** 통과 예제를 로컬 승인한 다음 예산이나 규칙 버전을 변경합니다. 재검토가 필요한 이유가 표시됩니다. 잘못된 JSON은 승인할 수 없습니다.
- **FlowMap:** 승인된 표준 흐름을 두 번 실행해 전송 기록이 중복 생성되지 않는지 확인하고, 실패 예제의 재시도를 비교합니다. 시간 계산은 주간 건수·검토 비율·사람의 작업 시간을 바꿔 재계산할 수 있습니다.
- **BriefLedger:** 초기 브리프의 보완 항목과 완성 예제의 9개 검사 결과를 비교합니다. 검토 후 요구사항을 변경하면 기존 검사 근거를 그대로 내보낼 수 없습니다.
- **AvatarOps:** 동일 시나리오의 기준 기록과 후보 기록을 비교하고 이벤트를 선택해 규칙 ID·관측값·기대값을 확인합니다. JSON의 사용자나 시간을 수정해 재검사할 수 있습니다.
- **StockBridge:** 합성 CSV 또는 작은 시험용 CSV를 불러와 열을 연결합니다. 수량 차이는 `실사 수량 − 예상 수량`으로 부호를 유지하고, 금액 차이는 `|수량 차이| × 단가`로 계산해 통화별로 분리합니다. 충돌 중복은 합산하지 않고 모두 보류합니다.
- **FaultLab:** 전체 실행에서 의도적으로 만든 결함 6개와 수정 결과를 비교합니다. 할인 금액 같은 경계값을 바꾸면 결함이 재현되지 않는 경우도 확인할 수 있습니다. 현재 입력에서 관측한 결함만 보고서로 만듭니다.

## 로컬 실행과 재현

Node.js 24와 npm을 사용합니다. 테스트는 Node의 TypeScript 실행 지원으로 순수 엔진을 직접 불러옵니다.

```bash
cd employer-workbench
npm ci
npm run dev
```

검증 명령:

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

현재 기록된 검증 결과는 **112개 Node 테스트 통과, 엄격한 TypeScript 검사 통과, Vite 프로덕션 빌드 통과**입니다. 실제 배포 화면에서 수행한 확인 범위와 남은 제한은 [릴리스 검증 기록](docs/RELEASE_REPORT.md)에 구분해 적었습니다. `tests/tests.json`은 브라우저 동작 시나리오 정의 파일이며 파일의 존재만으로 자동 E2E 통과를 주장하지 않습니다.

## 구현 구조

| 경로 | 역할 |
| --- | --- |
| `src/App.tsx` | 허용된 회사·탭만 처리하는 해시 라우터, 회사별 설명, 지연 로딩, 모듈 오류 복구 |
| `src/modules/<company>/engine.ts` | 입력 검증, 계산·상태 전이·판정, 근거 보고서 생성 |
| `src/modules/<company>/fixtures.ts` | 합성 정상·실패·경계 시나리오 |
| `src/modules/<company>/index.tsx` | 편집·실행·검토·파일 내보내기 화면 |
| `src/shared/catalog.ts` | 기업별 과제 선택 이유, 설계 결정, 공개 출처, 구현 범위 |
| `src/shared/storage.ts` | 크기·깊이·노드 수가 제한된 저장 상태 복원 |
| `src/shared/utils.ts` | 로컬 상태, 파일 저장, CSV 셀 이스케이프, 변경 표시 |
| `tests/*.test.mjs` | 순수 엔진과 저장 상태 경계의 실행 가능한 회귀 테스트 |
| `research/*-implementation.md` | 모듈별 구현 의도, 규칙, 재현 방법 |

React·TypeScript·Vite를 사용한 브라우저 앱입니다. 계산과 검사는 결정적으로 실행되며 운영 서버, 데이터베이스, 모델 호출 API 키를 요구하지 않습니다. 현재 공개 주소는 AppDeploy 배포입니다. `vercel.json`은 별도 환경에서 정적 빌드를 배포할 수 있는 이식용 설정이며 Vercel 배포가 수행되었다는 뜻은 아닙니다.

## 데이터와 판정의 범위

초기 데이터와 결함은 모두 시연용 합성 예제입니다. 실제 회사의 시스템·광고 계정·고객 데이터에 연결하지 않으며, 재고 조정·광고 집행·업무 전송 같은 운영 동작은 수행하지 않습니다. 실제 제품 적용에는 인증·권한·동시성·서버 저장·운영 규칙의 추가 설계가 필요합니다.

일부 도구의 편집 상태는 같은 브라우저의 `localStorage`에 남습니다. StockBridge에 넣은 CSV는 현재 탭 메모리에만 두고 새로고침하면 예제로 돌아갑니다. 앱 코드는 입력 데이터를 외부 API로 전송하지 않습니다. 브라우저 저장을 사용할 수 없으면 현재 화면에서 계속 작업하고 결과 파일을 내려받을 수 있습니다.

검토 기록과 짧은 변경 표시는 현재 입력의 재검토 필요 여부를 알려주는 로컬 기능입니다. 사용자 신원·전자서명·서버 감사 기록을 증명하지 않습니다. 시간 절감 추정은 입력한 가정의 계산이며 실측 성과가 아닙니다. AvatarOps의 시간도 합성 이벤트의 시간입니다. FaultLab의 의도된 결함 `FAIL`은 재현 결과이고 프로젝트 회귀 테스트 실패와는 별개입니다.

## 과제 선택에 사용한 공개 자료

공개 자료를 참고한 날짜: **2026-09-29**. 자료가 설명하는 직무·제품 맥락을 바탕으로 지원용 과제를 설계했으며, 내부 문제를 확인한 것으로 표현하지 않았습니다.

| 기업 | 공개 출처 |
| --- | --- |
| WINDLY | [AI Product Builder 공고](https://team.windly.cc/34981025-15df-80c0-af67-e6965f2dcf4f), [Pervis 제품](https://www.pervis.ai/) |
| INTERX | [공식 AX Coordinator 공고](https://interxlab.career.greetinghr.com/ko/o/210619), [기업 등록 공고](https://www.superookie.com/jobs/69d5a7316ebba30c560ad35c) |
| DOCENTY | [AI-native Builder 공고](https://www.rocketpunch.com/jobs/159343?list=true), [VibeOps 제품](https://vibeops.docenty.ai) |
| ENSAPIA | [AI Engineer 공고](https://recruit.cocone.co.kr/job_posting/xGnZyTs4), [AX Centric Engineer 공고](https://recruit.cocone.co.kr/job_posting/AH8VH2Bm) |
| VIBERS | [공식 고객 사례](https://www.vibers-ai.dev/ko/customers), [공식 팀 소개](https://www.vibers-ai.dev/ko/team) |
| WISEWIRES | [SQA 신입 공고](https://www.jobkorea.co.kr/Recruit/GI_Read/50025872), [이커머스 테스트 서비스](https://www.wisewires.com/services-ecommerce.html) |

AdSpec의 공식 API 규칙은 [Google Ads v24 CampaignBudget](https://developers.google.com/google-ads/api/reference/rpc/v24/CampaignBudget) 및 [MutateCampaignBudgetsRequest](https://developers.google.com/google-ads/api/reference/rpc/v24/MutateCampaignBudgetsRequest)의 일부 필드를 참고합니다. 시연용 운영 규칙은 공식 API 규칙과 별도로 표시합니다.

## 제작과 라이선스

권준의 기존 포트폴리오 맥락을 바탕으로 ChatGPT와 협업해 문제 선택·구현·검증·배포 자료를 작성했습니다. 이 저장소는 구현과 검증을 직접 설명하고 재현할 수 있도록 전체 소스와 테스트를 제공합니다.

기존 [ContextPatch AI](https://github.com/estona815/contextpatch-ai-datahub-2026)의 색상·검토 단계·근거 확인 패턴을 확장했고 기업별 모듈과 시나리오는 새로 구현했습니다. 정확한 참조 파일과 변경 내용은 [ATTRIBUTIONS.md](ATTRIBUTIONS.md), 라이선스는 [LICENSE](LICENSE), 저작권 고지는 [NOTICE](NOTICE)와 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.

GitHub에서는 기존 프로젝트와 분리된 `portfolio/company-workbench-20260929` 브랜치의 `employer-workbench/` 하위 폴더에 배치합니다. 기존 앱과 배포 워크플로는 이 작업 표본의 실행에 사용하지 않습니다.
