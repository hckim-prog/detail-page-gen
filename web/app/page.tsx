'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type ImgState = {
  url: string | null;
  name: string;
  w: number;
  h: number;
};

async function measureImage(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function Page() {
  // 출력 상세페이지 사이즈(나중에 PNG 생성용)
  const [outW, setOutW] = useState<number>(800);
  const [outH, setOutH] = useState<number>(1500);

  // Hook
  const [hook, setHook] = useState<string>('');

  // 이미지(앞표지/책등)
  const [cover, setCover] = useState<ImgState>({ url: null, name: '', w: 0, h: 0 });
  const [spine, setSpine] = useState<ImgState>({ url: null, name: '', w: 0, h: 0 });

  // 이전 objectURL 정리용
  const coverUrlRef = useRef<string | null>(null);
  const spineUrlRef = useRef<string | null>(null);

  // 3D 조절값
  const [depthPx, setDepthPx] = useState<number>(32); // 책 두께
  const [camY, setCamY] = useState<number>(24);       // 좌우 각도(샘플 느낌)
  const [camX, setCamX] = useState<number>(6);        // 위아래 각도(샘플 느낌)
  const [tiltZ, setTiltZ] = useState<number>(-2);     // 살짝 기울임(샘플 느낌)

  useEffect(() => {
    return () => {
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
      if (spineUrlRef.current) URL.revokeObjectURL(spineUrlRef.current);
    };
  }, []);

  const onPickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 선택해도 반응하도록 초기화
    if (!file) return;

    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    const url = URL.createObjectURL(file);
    coverUrlRef.current = url;

    const size = await measureImage(url);
    setCover({ url, name: file.name, w: size.w, h: size.h });
  };

  const onPickSpine = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (spineUrlRef.current) URL.revokeObjectURL(spineUrlRef.current);
    const url = URL.createObjectURL(file);
    spineUrlRef.current = url;

    const size = await measureImage(url);
    setSpine({ url, name: file.name, w: size.w, h: size.h });
  };

  // 미리보기(화면용)에서 책 앞표지 크기 자동 계산
  const previewFrontSize = useMemo(() => {
    // 미리보기 카드 안에서 “안 잘리게” 보이도록 상한값
    const MAX_W = 340;
    const MAX_H = 520;

    if (!cover.url || cover.w === 0 || cover.h === 0) {
      return { fw: 320, fh: 480 };
    }

    const aspect = cover.w / cover.h; // 가로/세로
    let fh = MAX_H;
    let fw = Math.round(fh * aspect);

    if (fw > MAX_W) {
      fw = MAX_W;
      fh = Math.round(fw / aspect);
    }

    return { fw, fh };
  }, [cover.url, cover.w, cover.h]);

  const canShow3D = !!cover.url && !!spine.url;

  return (
    <main className="page">
      <div className="wrap">
        <h1 className="title">상세페이지 제작</h1>

        {/* 0) 상세페이지 사이즈 */}
        <section className="card">
          <h2 className="cardTitle">0) 상세페이지 사이즈(픽셀)</h2>
          <p className="muted">가로/세로를 픽셀로 입력해요. (기본 800 × 1500)</p>

          <div className="row2">
            <div>
              <label className="label">가로(px)</label>
              <input
                className="input"
                type="number"
                min={200}
                max={4000}
                value={outW}
                onChange={(e) => setOutW(Number(e.target.value || 0))}
              />
            </div>
            <div>
              <label className="label">세로(px)</label>
              <input
                className="input"
                type="number"
                min={200}
                max={8000}
                value={outH}
                onChange={(e) => setOutH(Number(e.target.value || 0))}
              />
            </div>
          </div>

          <div className="pill">
            <div className="pillTitle">현재 설정</div>
            <div className="pillValue">{outW} × {outH} px</div>
            <div className="pillSub">(다음 단계에서 이 크기로 최종 이미지를 만들게 돼요)</div>
          </div>
        </section>

        {/* 1) 표지/책등 + Hook */}
        <section className="card">
          <h2 className="cardTitle">1) 앞표지 + 책등 + Hook</h2>
          <p className="muted">
            ✅ 앞표지(넓은 이미지)와 책등(얇고 긴 이미지)을 따로 올리면,
            오른쪽에서 샘플 각도로 입체표지로 보여줘요.
          </p>

          <div className="grid2">
            {/* 왼쪽: 입력 */}
            <div>
              <label className="label">Hook 메시지(표지 위 문구)</label>
              <input
                className="input"
                placeholder="예: 석·박사 학위논문을 품격 있게 완성하는 가이드"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
              />
              <div className="hint">권장: 18~35자</div>

              <div className="spacer" />

              <label className="label">앞표지 업로드(넓은 이미지)</label>
              <div className="fileRow">
                <input id="coverFile" className="fileInput" type="file" accept="image/*" onChange={onPickCover} />
                <label htmlFor="coverFile" className="fileBtn dark">
                  앞표지 이미지 선택하기
                </label>
              </div>
              <div className="fileMeta">
                {cover.url ? (
                  <>
                    <div>선택된 파일: <b>{cover.name}</b></div>
                    <div>원본 크기: {cover.w} × {cover.h}px</div>
                  </>
                ) : (
                  <div>아직 선택된 앞표지 파일이 없어요</div>
                )}
              </div>

              <div className="spacer" />

              <label className="label">책등 업로드(얇고 상하로 긴 이미지)</label>
              <div className="fileRow">
                <input id="spineFile" className="fileInput" type="file" accept="image/*" onChange={onPickSpine} />
                <label htmlFor="spineFile" className="fileBtn">
                  책등 이미지 선택하기
                </label>
              </div>
              <div className="fileMeta">
                {spine.url ? (
                  <>
                    <div>선택된 파일: <b>{spine.name}</b></div>
                    <div>원본 크기: {spine.w} × {spine.h}px</div>
                  </>
                ) : (
                  <div>아직 선택된 책등 파일이 없어요</div>
                )}
              </div>

              <div className="spacer" />

              <label className="label">책 두께(책등 깊이) 조절</label>
              <div className="sliderRow">
                <input
                  className="slider"
                  type="range"
                  min={16}
                  max={64}
                  value={depthPx}
                  onChange={(e) => setDepthPx(Number(e.target.value))}
                />
                <div className="chip">{depthPx}px</div>
              </div>
              <div className="hint">두께가 얇으면 18~28px, 두꺼우면 32~48px 추천</div>

              <div className="spacer" />

              <details className="details">
                <summary>샘플 각도 미세 조정(필요할 때만)</summary>
                <div className="subControls">
                  <div className="ctrl">
                    <div className="ctrlLabel">좌우 각도(Y)</div>
                    <input
                      className="slider"
                      type="range"
                      min={18}
                      max={30}
                      value={camY}
                      onChange={(e) => setCamY(Number(e.target.value))}
                    />
                    <div className="chip">{camY}°</div>
                  </div>

                  <div className="ctrl">
                    <div className="ctrlLabel">위아래 각도(X)</div>
                    <input
                      className="slider"
                      type="range"
                      min={0}
                      max={14}
                      value={camX}
                      onChange={(e) => setCamX(Number(e.target.value))}
                    />
                    <div className="chip">{camX}°</div>
                  </div>

                  <div className="ctrl">
                    <div className="ctrlLabel">기울임(Z)</div>
                    <input
                      className="slider"
                      type="range"
                      min={-8}
                      max={8}
                      value={tiltZ}
                      onChange={(e) => setTiltZ(Number(e.target.value))}
                    />
                    <div className="chip">{tiltZ}°</div>
                  </div>
                </div>
              </details>
            </div>

            {/* 오른쪽: 미리보기 */}
            <div>
              <div className="previewTitle">입체표지 미리보기(화면용)</div>

              <div className="previewCard">
                {!canShow3D ? (
                  <div className="empty">
                    <div className="emptyBig">앞표지 + 책등을 둘 다 올리면</div>
                    <div className="emptySmall">여기에 입체표지가 나타나요</div>
                  </div>
                ) : (
                  <Book3D
                    coverUrl={cover.url!}
                    spineUrl={spine.url!}
                    hook={hook}
                    frontW={previewFrontSize.fw}
                    frontH={previewFrontSize.fh}
                    depth={clamp(depthPx, 16, 64)}
                    camY={camY}
                    camX={camX}
                    tiltZ={tiltZ}
                  />
                )}
              </div>

              <div className="hint" style={{ marginTop: 10 }}>
                ※ “안 보이는 것처럼” 보이면 대부분 <b>미리보기 박스가 잘라먹는(overflow)</b> 문제인데,
                이 코드는 <b>잘리지 않게</b> 만들어놨어요.
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          background: #fafafa;
          min-height: 100vh;
          padding: 24px;
        }
        .wrap {
          max-width: 1100px;
          margin: 0 auto;
        }
        .title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 14px;
        }
        .card {
          background: #fff;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        }
        .cardTitle {
          font-weight: 800;
          margin-bottom: 6px;
        }
        .muted {
          color: rgba(0,0,0,0.65);
          margin-bottom: 14px;
          line-height: 1.4;
        }
        .row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: end;
        }
        .label {
          display: block;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .input {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: rgba(0,0,0,0.3);
        }
        .hint {
          font-size: 12px;
          color: rgba(0,0,0,0.55);
          margin-top: 6px;
        }
        .pill {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .pillTitle { font-weight: 800; }
        .pillValue { margin-top: 4px; font-weight: 800; font-size: 16px; }
        .pillSub { margin-top: 4px; font-size: 12px; color: rgba(0,0,0,0.55); }

        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          align-items: start;
        }

        .spacer { height: 14px; }

        .fileRow { display: flex; gap: 10px; align-items: center; }
        .fileInput { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

        .fileBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.16);
          background: #fff;
          font-weight: 800;
          cursor: pointer;
          user-select: none;
        }
        .fileBtn.dark {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .fileMeta {
          margin-top: 8px;
          font-size: 12px;
          color: rgba(0,0,0,0.6);
        }

        .sliderRow {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .slider { width: 100%; }
        .chip {
          min-width: 64px;
          text-align: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.08);
          font-weight: 800;
          font-size: 12px;
        }

        .details {
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 14px;
          padding: 10px 12px;
          background: rgba(0,0,0,0.02);
        }
        summary {
          cursor: pointer;
          font-weight: 800;
        }
        .subControls {
          margin-top: 10px;
          display: grid;
          gap: 10px;
        }
        .ctrl {
          display: grid;
          grid-template-columns: 120px 1fr 70px;
          gap: 10px;
          align-items: center;
        }
        .ctrlLabel { font-size: 12px; font-weight: 800; color: rgba(0,0,0,0.7); }

        .previewTitle {
          font-weight: 800;
          margin-bottom: 8px;
        }

        /* 여기 중요: previewCard가 잘라먹으면 3D가 안 보이는 것처럼 됨.
           그래서 overflow: visible 로 두고 padding을 넉넉히 줌 */
        .previewCard {
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background: #f7f2cf;
          padding: 24px;
          min-height: 620px;
          overflow: visible;
          position: relative;
        }

        .empty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          text-align: center;
          color: rgba(0,0,0,0.55);
        }
        .emptyBig { font-weight: 900; font-size: 16px; }
        .emptySmall { margin-top: 6px; font-size: 13px; }
      `}</style>
    </main>
  );
}

function Book3D(props: {
  coverUrl: string;
  spineUrl: string;
  hook: string;
  frontW: number;
  frontH: number;
  depth: number;
  camY: number;
  camX: number;
  tiltZ: number;
}) {
  const { coverUrl, spineUrl, hook, frontW, frontH, depth, camY, camX, tiltZ } = props;

  // 페이지(오른쪽 면) 패턴
  const pagesBg = useMemo(() => {
    return `repeating-linear-gradient(
      to bottom,
      rgba(0,0,0,0.10),
      rgba(0,0,0,0.10) 1px,
      rgba(255,255,255,0.0) 1px,
      rgba(255,255,255,0.0) 7px
    )`;
  }, []);

  return (
    <div className="stage">
      <div
        className="bookWrap"
        style={
          {
            ['--fw' as any]: `${frontW}px`,
            ['--fh' as any]: `${frontH}px`,
            ['--d' as any]: `${depth}px`,
            ['--ry' as any]: `${-camY}deg`,
            ['--rx' as any]: `${camX}deg`,
            ['--rz' as any]: `${tiltZ}deg`,
          } as React.CSSProperties
        }
      >
        <div className="shadow" />
        <div className="book">
          {/* FRONT */}
          <div className="face front" style={{ backgroundImage: `url("${coverUrl}")` }}>
            {hook?.trim() ? <div className="hook">{hook}</div> : <div className="hook ghost">Hook 메시지가 여기에 올라갑니다</div>}
          </div>

          {/* BACK (간단히 같은 이미지+어둡게) */}
          <div className="face back" style={{ backgroundImage: `url("${coverUrl}")` }} />

          {/* LEFT = SPINE */}
          <div className="face left" style={{ backgroundImage: `url("${spineUrl}")` }} />

          {/* RIGHT = PAGES */}
          <div className="face right" style={{ backgroundImage: pagesBg }} />

          {/* TOP/BOTTOM (있으면 더 자연스럽지만 최소 구현) */}
          <div className="face top" />
          <div className="face bottom" />
        </div>
      </div>

      <style jsx>{`
        .stage {
          width: 100%;
          height: 560px;
          display: grid;
          place-items: center;
          overflow: visible;
        }

        .bookWrap {
          position: relative;
          width: calc(var(--fw) + 200px);
          height: calc(var(--fh) + 200px);
          display: grid;
          place-items: center;
          perspective: 1200px;
          overflow: visible;
        }

        .shadow {
          position: absolute;
          width: calc(var(--fw) * 0.95);
          height: calc(var(--fh) * 0.25);
          border-radius: 999px;
          background: rgba(0,0,0,0.22);
          filter: blur(22px);
          transform: translateY(calc(var(--fh) * 0.35));
          opacity: 0.55;
        }

        .book {
          position: relative;
          width: var(--fw);
          height: var(--fh);
          transform-style: preserve-3d;
          transform:
            rotateY(var(--ry))
            rotateX(var(--rx))
            rotateZ(var(--rz))
            translateZ(0px);
          filter: drop-shadow(0 22px 35px rgba(0,0,0,0.25));
        }

        .face {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-radius: 18px;
          backface-visibility: hidden;
        }

        /* FRONT/BACK */
        .front {
          transform: translateZ(calc(var(--d) / 2));
          overflow: hidden;
        }
        .back {
          transform: rotateY(180deg) translateZ(calc(var(--d) / 2));
          filter: brightness(0.82);
        }

        /* SPINE (LEFT) */
        .left {
          width: var(--d);
          height: var(--fh);
          border-radius: 14px;
          transform: rotateY(-90deg) translateZ(calc(var(--fw) / 2));
          transform-origin: left center;
          filter: brightness(0.96);
        }

        /* PAGES (RIGHT) */
        .right {
          width: var(--d);
          height: var(--fh);
          border-radius: 14px;
          transform: rotateY(90deg) translateZ(calc(var(--fw) / 2));
          transform-origin: right center;
          background-color: #f7f7f7;
          background-size: cover;
          filter: brightness(1.03);
        }

        /* TOP/BOTTOM */
        .top {
          height: var(--d);
          width: var(--fw);
          border-radius: 14px;
          transform: rotateX(90deg) translateZ(calc(var(--fh) / 2));
          transform-origin: top center;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(0,0,0,0.05));
        }
        .bottom {
          height: var(--d);
          width: var(--fw);
          border-radius: 14px;
          transform: rotateX(-90deg) translateZ(calc(var(--fh) / 2));
          transform-origin: bottom center;
          background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(255,255,255,0.75));
        }

        /* Hook 배너 */
        .hook {
          position: absolute;
          left: 18px;
          right: 18px;
          top: 18px;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(0,0,0,0.55);
          color: #fff;
          font-weight: 900;
          font-size: 14px;
          line-height: 1.25;
          backdrop-filter: blur(6px);
        }
        .hook.ghost {
          background: rgba(0,0,0,0.32);
        }
      `}</style>
    </div>
  );
}
