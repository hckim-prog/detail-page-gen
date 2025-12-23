"use client";

import React, { useEffect, useMemo, useState } from "react";

type Feature = {
  title: string;
  desc: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
};

const FEATURE_COUNT = 5;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Page() {
  // =========================
  // 0) 상세페이지 사이즈(px)
  // =========================
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [pageHeight, setPageHeight] = useState<number>(1500);

  // =========================
  // 1) Hook + 앞표지/책등 분리 업로드
  // =========================
  const [hookText, setHookText] = useState("");

  // 앞표지(넓은 이미지)
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [frontNat, setFrontNat] = useState<{ w: number; h: number } | null>(null);

  // 책등(얇고 긴 이미지)
  const [spineFile, setSpineFile] = useState<File | null>(null);
  const [spineUrl, setSpineUrl] = useState<string | null>(null);
  const [spineNat, setSpineNat] = useState<{ w: number; h: number } | null>(null);

  // 책 두께(=책등 깊이) 표시 배율
  const [thicknessScale, setThicknessScale] = useState<number>(1.0);

  // =========================
  // (미리보기 각도) 샘플 각도 맞추는 핵심 3개
  // =========================
  const CAMERA_PERSPECTIVE = 1400; // 원근감(큰 값=왜곡 적음)
  const CAMERA_ROTATE_Y = 22;      // 좌측 책등이 보이는 각도(샘플 느낌)
  const CAMERA_ROTATE_X = 1.8;     // 살짝 위/아래 기울기
  const CAMERA_ROTATE_Z = -0.8;    // 아주 미세한 기울기

  // =========================
  // 2) 특징 5개
  // =========================
  const [features, setFeatures] = useState<Feature[]>(
    Array.from({ length: FEATURE_COUNT }, () => ({
      title: "",
      desc: "",
      imageFile: null,
      imagePreviewUrl: null,
    }))
  );

  const updateFeature = (idx: number, patch: Partial<Feature>) => {
    setFeatures((prev) => {
      const next = [...prev];
      const old = next[idx];

      if (patch.imageFile && old.imagePreviewUrl) {
        URL.revokeObjectURL(old.imagePreviewUrl);
      }

      const merged: Feature = { ...old, ...patch };

      if (patch.imageFile) {
        merged.imagePreviewUrl = URL.createObjectURL(patch.imageFile);
      }

      next[idx] = merged;
      return next;
    });
  };

  // =========================
  // 앞표지 URL/원본크기 읽기
  // =========================
  useEffect(() => {
    if (!frontFile) {
      setFrontUrl(null);
      setFrontNat(null);
      return;
    }
    const url = URL.createObjectURL(frontFile);
    setFrontUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!frontUrl) {
      setFrontNat(null);
      return;
    }
    const img = new Image();
    img.onload = () => setFrontNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = frontUrl;
  }, [frontUrl]);

  // =========================
  // 책등 URL/원본크기 읽기
  // =========================
  useEffect(() => {
    if (!spineFile) {
      setSpineUrl(null);
      setSpineNat(null);
      return;
    }
    const url = URL.createObjectURL(spineFile);
    setSpineUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [spineFile]);

  useEffect(() => {
    if (!spineUrl) {
      setSpineNat(null);
      return;
    }
    const img = new Image();
    img.onload = () => setSpineNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = spineUrl;
  }, [spineUrl]);

  // =========================
  // ✅ 3D 책 박스 크기 계산 (박스 방식)
  //   W = 앞표지 가로
  //   H = 책 높이
  //   D = 책 두께(=책등 면 가로, depth)
  // =========================
  const PREVIEW_H = 560;
  const MAX_W = 420;

  const bookDims = useMemo(() => {
    let H = PREVIEW_H;
    let W = 320; // front width
    let D = 28;  // depth (=spine thickness)

    // 앞표지 스케일(높이 기준 + 폭 제한)
    if (frontNat) {
      const scaleByH = PREVIEW_H / frontNat.h;
      const scaleByW = MAX_W / frontNat.w;
      const scale = Math.min(scaleByH, scaleByW);
      W = Math.round(frontNat.w * scale);
      H = Math.round(frontNat.h * scale);
    }

    // 책등 두께(D): 책등 이미지의 가로폭을 높이에 맞춰 환산
    if (spineNat) {
      const scale = H / spineNat.h;
      const rawD = spineNat.w * scale * thicknessScale;
      D = Math.round(rawD);
      D = clamp(D, 16, 80);
    }

    return { W, H, D };
  }, [frontNat, spineNat, thicknessScale]);

  const isReady = useMemo(() => {
    return (
      pageWidth >= 300 &&
      pageHeight >= 400 &&
      hookText.trim().length > 0 &&
      Boolean(frontFile) &&
      Boolean(spineFile)
    );
  }, [pageWidth, pageHeight, hookText, frontFile, spineFile]);

  const handleGenerate = () => {
    const payload = {
      pageSizePx: { width: pageWidth, height: pageHeight },
      hookText,
      frontFileName: frontFile?.name ?? null,
      spineFileName: spineFile?.name ?? null,
      frontNaturalSize: frontNat,
      spineNaturalSize: spineNat,
      thicknessScale,
      camera: {
        perspective: CAMERA_PERSPECTIVE,
        rotateY: CAMERA_ROTATE_Y,
        rotateX: CAMERA_ROTATE_X,
        rotateZ: CAMERA_ROTATE_Z,
      },
      features: features.map((f, i) => ({
        idx: i + 1,
        title: f.title,
        desc: f.desc,
        imageFileName: f.imageFile?.name ?? null,
      })),
    };

    alert("입력이 잘 들어왔어요!\n\n" + JSON.stringify(payload, null, 2));
  };

  // =========================
  // 3D 스타일 변수
  // =========================
  const cssVars = {
    // @ts-ignore
    "--bookW": `${bookDims.W}px`,
    "--bookH": `${bookDims.H}px`,
    "--bookD": `${bookDims.D}px`,
    // @ts-ignore
    "--persp": `${CAMERA_PERSPECTIVE}px`,
    "--rotY": `${CAMERA_ROTATE_Y}deg`,
    "--rotX": `${CAMERA_ROTATE_X}deg`,
    "--rotZ": `${CAMERA_ROTATE_Z}deg`,
  } as React.CSSProperties;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">상세페이지 생성기</h1>
        <p className="mt-2 text-sm text-neutral-600">
          ✅ “앞표지(넓은 이미지)” + “책등(얇고 긴 이미지)”를 합쳐서,
          <b>샘플과 비슷한 각도의 3D 책</b>으로 미리보기를 만듭니다.
        </p>

        {/* 0) Size */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-semibold">0) 상세페이지 사이즈(픽셀)</h2>
          <p className="mt-2 text-sm text-neutral-600">가로/세로를 픽셀로 입력하세요. (기본 800 × 1500)</p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">가로(px)</label>
              <input
                type="number"
                min={300}
                max={3000}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-600"
                value={pageWidth}
                onChange={(e) => setPageWidth(Number(e.target.value || 0))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">세로(px)</label>
              <input
                type="number"
                min={400}
                max={5000}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-600"
                value={pageHeight}
                onChange={(e) => setPageHeight(Number(e.target.value || 0))}
              />
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
              <div className="font-semibold">현재 설정</div>
              <div className="mt-1">{pageWidth} × {pageHeight} px</div>
              <div className="mt-2 text-xs text-neutral-500">(다음 단계에서 서버가 이 크기로 이미지를 생성)</div>
            </div>
          </div>
        </section>

        {/* 1) Cover + Hook */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-semibold">1) 표지 입력(앞표지 + 책등) + Hook</h2>
          <p className="mt-2 text-sm text-neutral-600">
            ✅ 앞표지(넓은 이미지) / 책등(얇고 긴 이미지)을 각각 넣으면
            <b>3D 책 박스</b>로 합쳐서 샘플 각도처럼 보여줍니다.
          </p>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {/* Left controls */}
            <div>
              <label className="text-sm font-medium">Hook 메시지(표지 위 문구)</label>
              <input
                className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-600"
                placeholder="예: 석·박사 학위논문을 품격 있게 완성하는 가이드"
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
              />
              <p className="mt-2 text-xs text-neutral-500">권장: 18~35자</p>

              {/* Front upload */}
              <div className="mt-6">
                <div className="text-sm font-medium">앞표지 업로드(넓은 이미지)</div>
                <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800">
                  앞표지 이미지 선택하기
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="mt-2 text-xs text-neutral-600">
                  선택된 파일: <b>{frontFile?.name ?? "없음"}</b>
                </div>
                {frontNat && (
                  <div className="mt-1 text-xs text-neutral-500">
                    원본 크기: {frontNat.w} × {frontNat.h}px
                  </div>
                )}
              </div>

              {/* Spine upload */}
              <div className="mt-6">
                <div className="text-sm font-medium">책등 업로드(얇고 상하로 긴 이미지)</div>
                <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm hover:bg-neutral-50">
                  책등 이미지 선택하기
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSpineFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="mt-2 text-xs text-neutral-600">
                  선택된 파일: <b>{spineFile?.name ?? "없음"}</b>
                </div>
                {spineNat && (
                  <div className="mt-1 text-xs text-neutral-500">
                    원본 크기: {spineNat.w} × {spineNat.h}px
                  </div>
                )}
              </div>

              {/* thickness */}
              <div className="mt-6">
                <label className="text-sm font-medium">책 두께(책등 깊이) 조절</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0.7}
                    max={1.8}
                    step={0.05}
                    value={thicknessScale}
                    onChange={(e) => setThicknessScale(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-16 rounded-xl border border-neutral-300 bg-white px-2 py-1 text-center text-sm">
                    {thicknessScale.toFixed(2)}x
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  샘플처럼 보이게 하려면 보통 0.9~1.2 사이에서 맞춰집니다.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600">
                <div className="font-semibold text-sm text-neutral-800">샘플 각도 미세조정 방법</div>
                <div className="mt-2">
                  코드 상단의 <b>CAMERA_ROTATE_Y</b> 값만 18~28 사이로 바꾸면
                  “샘플 각도”에 더 가까워집니다.
                </div>
              </div>
            </div>

            {/* Right preview */}
            <div>
              <label className="text-sm font-medium">입체표지 미리보기(샘플 각도)</label>

              <div className="mt-2 rounded-2xl border border-neutral-200 bg-[#f5e7a8] p-6">
                {/* 배경 질감 느낌(가볍게) */}
                <div className="relative rounded-2xl bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.25),transparent_40%),linear-gradient(to_bottom,rgba(255,255,255,0.15),rgba(255,255,255,0.0))] p-6">
                  <div className="flex items-center justify-center">
                    <div className="scene" style={cssVars}>
                      {/* 바닥 그림자 */}
                      <div className="shadow-ellipse" />

                      {/* 3D Book */}
                      <div className="book">
                        {/* FRONT (앞표지) */}
                        <div className="face front">
                          <div className="faceInner">
                            {frontUrl ? (
                              <div className="relative h-full w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={frontUrl}
                                  alt="front"
                                  className="h-full w-full object-contain"
                                  draggable={false}
                                />
                                {/* Hook 오버레이 */}
                                <div className="absolute left-0 right-0 top-0 bg-black/40 px-4 py-3">
                                  <div className="text-sm font-semibold text-white break-words">
                                    {hookText.trim() ? hookText : "Hook 메시지가 여기에 올라갑니다"}
                                  </div>
                                </div>

                                {/* 앞표지 하이라이트 */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/18 via-transparent to-black/10" />
                                {/* 책등쪽 가장자리 그림자 */}
                                <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/12 to-transparent" />
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                                앞표지를 업로드하세요
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LEFT (책등) */}
                        <div className="face left">
                          <div className="faceInner">
                            {spineUrl ? (
                              <div className="relative h-full w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={spineUrl}
                                  alt="spine"
                                  className="h-full w-full object-contain"
                                  draggable={false}
                                />
                                {/* 책등 셰이딩 */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/18 via-transparent to-white/10" />
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                                책등을 업로드하세요
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RIGHT (책 옆면/페이지) - 샘플에서는 거의 안 보이지만 입체감용 */}
                        <div className="face right">
                          <div className="pages" />
                        </div>

                        {/* BACK (뒷면) - 거의 안 보이지만 박스 안정용 */}
                        <div className="face back">
                          <div className="backPlate" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-neutral-700">
                    이 미리보기는 “샘플 각도에 맞춘 3D 박스”입니다. 다음 단계에서 서버가 최종 PNG(800×1500 등)를 생성합니다.
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">
                    현재 책 크기(화면용): W {bookDims.W}px / H {bookDims.H}px / 두께 D {bookDims.D}px
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2) Features */}
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200">
          <h2 className="text-lg font-semibold">2) 특징 5개(텍스트 + 이미지 매칭)</h2>
          <p className="mt-2 text-sm text-neutral-600">
            특징은 “카드 1개 = 제목/설명/이미지 1개”로 묶여서 절대 꼬이지 않아요.
          </p>

          <div className="mt-6 grid gap-6">
            {features.map((f, idx) => (
              <div key={idx} className="rounded-2xl border border-neutral-200 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">특징 {idx + 1}</div>
                  <div className="text-xs text-neutral-500">(title/desc/image 한 세트)</div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-700">제목</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-600"
                        value={f.title}
                        onChange={(e) => updateFeature(idx, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-700">설명</label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-600"
                        rows={3}
                        value={f.desc}
                        onChange={(e) => updateFeature(idx, { desc: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-700">관련 이미지 업로드</label>
                      <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50">
                        특징 {idx + 1} 이미지 선택하기
                        <input
                          className="hidden"
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            updateFeature(idx, { imageFile: e.target.files?.[0] ?? null })
                          }
                        />
                      </label>

                      <div className="mt-2 text-xs text-neutral-600">
                        선택된 파일: <b>{f.imageFile?.name ?? "없음"}</b>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">이미지 미리보기</label>
                    <div className="mt-1 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                      <div className="relative aspect-[16/9] w-full">
                        {f.imagePreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.imagePreviewUrl}
                            alt={`feature ${idx + 1} preview`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                            특징 {idx + 1} 이미지를 업로드하면 여기 보입니다
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-neutral-500">파일명: {f.imageFile?.name ?? "없음"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Generate */}
        <section className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-neutral-600">
            다음 단계에서 이 입력값을 서버로 보내서 “상세페이지 PNG”를 생성합니다.
          </div>
          <button
            className={`rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm ring-1 transition ${isReady
                ? "bg-black text-white ring-black hover:bg-neutral-800"
                : "bg-neutral-200 text-neutral-500 ring-neutral-200 cursor-not-allowed"
              }`}
            disabled={!isReady}
            onClick={handleGenerate}
          >
            생성하기(테스트)
          </button>
        </section>

        {/* 3D CSS */}
        <style jsx>{`
          .scene {
            position: relative;
            perspective: var(--persp);
            width: calc(var(--bookW) + var(--bookD) + 80px);
            height: calc(var(--bookH) + 80px);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .shadow-ellipse {
            position: absolute;
            width: 280px;
            height: 34px;
            background: rgba(0, 0, 0, 0.18);
            filter: blur(18px);
            border-radius: 999px;
            transform: translateY(calc(var(--bookH) / 2 + 18px));
          }

          .book {
            position: relative;
            width: var(--bookW);
            height: var(--bookH);
            transform-style: preserve-3d;
            transform: rotateY(var(--rotY)) rotateX(var(--rotX)) rotateZ(var(--rotZ));
            filter: drop-shadow(0 18px 22px rgba(0, 0, 0, 0.22));
          }

          .face {
            position: absolute;
            top: 50%;
            left: 50%;
            transform-style: preserve-3d;
            backface-visibility: hidden;
          }

          /* 앞면: z = +D/2 */
          .front {
            width: var(--bookW);
            height: var(--bookH);
            transform: translate(-50%, -50%) translateZ(calc(var(--bookD) / 2));
          }

          /* 뒷면: z = -D/2 */
          .back {
            width: var(--bookW);
            height: var(--bookH);
            transform: translate(-50%, -50%) rotateY(180deg) translateZ(calc(var(--bookD) / 2));
          }

          /* 왼쪽면(책등): x = -W/2 */
          .left {
            width: var(--bookD);
            height: var(--bookH);
            transform: translate(-50%, -50%) rotateY(-90deg) translateZ(calc(var(--bookW) / 2));
          }

          /* 오른쪽면(페이지): x = +W/2 */
          .right {
            width: var(--bookD);
            height: var(--bookH);
            transform: translate(-50%, -50%) rotateY(90deg) translateZ(calc(var(--bookW) / 2));
          }

          .faceInner {
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: 18px;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.08);
          }

          /* 앞표지 모서리는 샘플처럼 살짝 둥글게 */
          .front .faceInner {
            border-radius: 22px;
          }

          /* 책등은 모서리 조금 덜 둥글게 */
          .left .faceInner {
            border-radius: 16px;
          }

          /* 페이지면(오른쪽)은 흰색 종이 느낌 + 아주 약한 줄 */
          .pages {
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, #f6f6f6, #ffffff 35%, #f0f0f0);
            border-radius: 14px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
          }

          .pages::after {
            content: "";
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.03),
              rgba(0, 0, 0, 0.03) 1px,
              transparent 1px,
              transparent 7px
            );
            opacity: 0.18;
          }

          .backPlate {
            width: 100%;
            height: 100%;
            background: #ffffff;
            border-radius: 22px;
            border: 1px solid rgba(0, 0, 0, 0.06);
          }
        `}</style>
      </div>
    </main>
  );
}
