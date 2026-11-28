"use client";

import {
  CheckCircle2,
  CircleX,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LoaderCircle,
  Music2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { mediaAssetUrl } from "../../_features/media/api";
import { useMediaGeneration } from "../../_features/media/useMediaGeneration";
import { testTextModel } from "../../_features/models/api";
import type {
  Model,
  ModelTestResult,
  Preferences,
} from "../../_features/models/types";
import {
  acceptForAssetType,
  GenerationParameterInput,
} from "../media/GenerationParameterInput";

type ModelTestPanelProps = {
  model: Model;
  models: Model[];
  preferences: Preferences | null;
  onClose: () => void;
};

type MediaMode = "image" | "video" | "audio";

const testModeLabels = {
  text: "文本连接",
  image: "图片生成",
  video: "视频生成",
  audio: "音频任务",
} as const;

export function ModelTestPanel({
  model,
  models,
  preferences,
  onClose,
}: ModelTestPanelProps) {
  const mode = testModeFor(model);
  const available =
    model.integrationStatus === "ready" &&
    (model.configured || model.providerId === "codex_local");
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="model-test-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="model-test-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-test-title"
      >
        <header className="model-test-dialog-head">
          <span className={`model-test-dialog-icon ${mode ?? "unavailable"}`}>
            <FlaskConical size={19} />
          </span>
          <div>
            <span className="eyebrow">
              {mode ? testModeLabels[mode] : "能力测试"}
            </span>
            <h2 id="model-test-title">{model.name}</h2>
            <p>
              {model.providerName} · {model.modelKey}
            </p>
          </div>
          <span className={`model-status ${available ? "ready" : ""}`}>
            {available ? "可测试" : "需先配置"}
          </span>
          <button
            className="model-test-dialog-close"
            type="button"
            aria-label="关闭模型测试"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="model-test-dialog-body">
          {!available ? (
            <div className="model-test-unavailable">
              <CircleX size={20} />
              <div>
                <strong>模型当前不可测试</strong>
                <p>
                  请先在“连接与测试”中完成凭证或运行时配置，再回来执行测试。
                </p>
              </div>
            </div>
          ) : mode === "text" ? (
            <TextModelTest key={model.id} model={model} />
          ) : mode ? (
            <MediaModelTest
              key={model.id}
              model={model}
              mode={mode}
              models={models}
              preferences={preferences}
            />
          ) : (
            <div className="model-test-unavailable">
              <CircleX size={20} />
              <div>
                <strong>没有可执行的测试能力</strong>
                <p>该模型还没有声明文本或媒体生成能力。</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function TextModelTest({ model }: { model: Model }) {
  const [prompt, setPrompt] = useState("只回复：模型连接正常");
  const [result, setResult] = useState<ModelTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  async function runTest() {
    if (!prompt.trim() || testing) return;
    setTesting(true);
    setResult(null);
    try {
      setResult(await testTextModel(model.id, model.providerId, prompt.trim()));
    } catch (error) {
      setResult({
        success: false,
        modelId: model.id,
        providerId: model.providerId,
        latencyMs: 0,
        message: (error as Error).message,
        responsePreview: "",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="model-test-layout">
      <section className="model-test-form">
        <div className="model-test-section-head">
          <div>
            <span>连接测试</span>
            <h3>发送一条测试消息</h3>
          </div>
          <span className="mini-badge">不会生成媒体</span>
        </div>
        <label className="workbench-field">
          <span>测试提示词</span>
          <textarea
            rows={6}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <div className="model-test-submit-row">
          <p>测试只检查模型连接和响应，不创建生成任务。</p>
          <button
            className="primary-action"
            type="button"
            disabled={!prompt.trim() || testing}
            onClick={() => void runTest()}
          >
            {testing ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <FlaskConical size={16} />
            )}
            {testing ? "正在测试" : "开始测试"}
          </button>
        </div>
      </section>

      <section className="model-test-output">
        <div className="model-test-section-head">
          <div>
            <span>测试结果</span>
            <h3>模型响应</h3>
          </div>
        </div>
        {result ? (
          <div
            className={`model-test-response ${
              result.success ? "success" : "failure"
            }`}
          >
            <div className="model-test-response-head">
              {result.success ? (
                <CheckCircle2 size={18} />
              ) : (
                <CircleX size={18} />
              )}
              <strong>{result.success ? "连接正常" : "测试失败"}</strong>
              <span>{result.latencyMs} ms</span>
            </div>
            <p>{result.message}</p>
            {result.responsePreview && (
              <blockquote>{result.responsePreview}</blockquote>
            )}
          </div>
        ) : (
          <div className="model-test-empty">
            <FlaskConical size={22} />
            <strong>等待测试</strong>
            <p>提交提示词后，响应和耗时将显示在这里。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MediaModelTest({
  model,
  mode,
  models,
  preferences,
}: {
  model: Model;
  mode: MediaMode;
  models: Model[];
  preferences: Preferences | null;
}) {
  const generation = useMediaGeneration(models, preferences, {
    initialMode: mode,
    initialPrompt: defaultPromptFor(mode),
    fixedModelId: model.id,
  });
  const assetIds = generation.task?.resultAssetIds ?? [];
  const isWorkflowModel = model.kind === "comfy_workflow";
  const missingRequired =
    generation.formParameters.some((parameter) => {
      if (parameter.type === "assets" || !parameter.required) return false;
      const value = generation.parameterValues[parameter.key];
      return value == null || value === "";
    }) ||
    generation.referenceInputs.some(
      (parameter) =>
        parameter.required &&
        (generation.assetIdsByParameter[parameter.type]?.length ?? 0) <
          (parameter.min ?? 0),
    );

  return (
    <div className="model-test-layout">
      <section className="model-test-form">
        <div className="model-test-section-head">
          <div>
            <span>真实执行</span>
            <h3>提交一次生成测试</h3>
          </div>
          <span className="mini-badge">
            {isWorkflowModel ? "ComfyUI 工作流" : "内置模型"}
          </span>
        </div>

        <label className="workbench-field">
          <span>测试提示词{generation.promptRequired ? "" : "（可选）"}</span>
          <textarea
            rows={4}
            value={generation.prompt}
            onChange={(event) => generation.setPrompt(event.target.value)}
            placeholder={defaultPromptFor(mode)}
          />
        </label>

        {isWorkflowModel ? (
          <div className="model-test-parameter-grid">
            {generation.formParameters
              .filter((parameter) => parameter.type !== "assets")
              .map((parameter) => (
                <GenerationParameterInput
                  key={parameter.key}
                  parameter={parameter}
                  value={generation.parameterValues[parameter.key]}
                  onChange={(value) =>
                    generation.setParameter(parameter.key, value)
                  }
                />
              ))}
          </div>
        ) : mode === "audio" ? null : (
          <div className="model-test-basic-grid">
            <label className="workbench-field">
              <span>画幅</span>
              <select
                value={generation.aspectRatio}
                onChange={(event) =>
                  generation.setAspectRatio(event.target.value)
                }
              >
                <option value="16:9">16:9 横屏</option>
                <option value="9:16">9:16 竖屏</option>
                <option value="1:1">1:1 方形</option>
              </select>
            </label>
            <label className="workbench-field">
              <span>{mode === "image" ? "数量" : "视频长度"}</span>
              <select
                value={generation.count}
                disabled={mode === "video"}
                onChange={(event) =>
                  generation.setCount(Number(event.target.value))
                }
              >
                {mode === "image" ? (
                  <>
                    <option value="1">1 张</option>
                    <option value="2">2 张</option>
                  </>
                ) : (
                  <option value="1">17 帧 / 约 1.4 秒</option>
                )}
              </select>
            </label>
          </div>
        )}

        {generation.referenceInputs.map((parameter) => {
          const selected = generation.assetIdsByParameter[parameter.type] ?? [];
          const Icon =
            parameter.type === "video"
              ? Video
              : parameter.type === "audio"
                ? Music2
                : parameter.type === "file"
                  ? FileText
                  : ImageIcon;
          return (
            <div className="model-test-assets" key={parameter.type}>
              <label className="asset-upload-button">
                <Icon size={18} />
                <div>
                  <strong>
                    {parameter.label}
                    {generation.uploadingAssets ? "（上传中）" : ""}
                  </strong>
                  <span>
                    已选 {selected.length} 个
                    {parameter.min ? ` · 至少 ${parameter.min}` : ""}
                    {parameter.max ? ` · 最多 ${parameter.max}` : ""}
                  </span>
                </div>
                <input
                  type="file"
                  accept={acceptForAssetType(parameter.type)}
                  multiple
                  disabled={generation.uploadingAssets}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    void generation.uploadAssets(parameter.type, files);
                    event.target.value = "";
                  }}
                />
              </label>
              {selected.length > 0 && (
                <div className="model-test-asset-list">
                  {selected.map((assetId, index) => (
                    <button
                      key={assetId}
                      type="button"
                      title="移除测试素材"
                      onClick={() =>
                        generation.removeAsset(parameter.type, assetId)
                      }
                    >
                      {parameter.type === "video" ? (
                        <video
                          src={mediaAssetUrl(assetId)}
                          muted
                          preload="metadata"
                        />
                      ) : parameter.type === "audio" ? (
                        <Music2 size={20} />
                      ) : parameter.type === "file" ? (
                        <FileText size={20} />
                      ) : (
                        <img
                          src={mediaAssetUrl(assetId)}
                          alt={`${parameter.label} ${index + 1}`}
                        />
                      )}
                      <span>{index + 1}</span>
                      <X size={11} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="model-test-notice">
          <Upload size={16} />
          <p>
            测试会创建真实的持久化任务，结果进入素材库。关闭面板不会停止 ComfyUI
            中已经开始的执行。
          </p>
        </div>

        {generation.isSubmitting ? (
          <button
            className="primary-action model-test-stop"
            type="button"
            onClick={generation.cancel}
          >
            停止等待
          </button>
        ) : (
          <button
            className="primary-action"
            type="button"
            disabled={
              (generation.promptRequired && !generation.prompt.trim()) ||
              missingRequired ||
              generation.uploadingAssets
            }
            onClick={() => void generation.generate()}
          >
            <FlaskConical size={16} />
            开始测试
          </button>
        )}
      </section>

      <section className="model-test-output">
        <div className="model-test-section-head">
          <div>
            <span>任务结果</span>
            <h3>测试输出</h3>
          </div>
          {generation.task && (
            <span className="mini-badge">
              {taskStatusLabel(generation.task.status)}
            </span>
          )}
        </div>

        {generation.task ? (
          <div className="model-test-task">
            <div className="model-test-task-head">
              <div>
                <strong>{taskStatusLabel(generation.task.status)}</strong>
                <code>{generation.task.id}</code>
              </div>
              <span>{generation.task.progress ?? 0}%</span>
            </div>
            <div className="model-test-progress">
              <span
                style={{
                  width: `${Math.max(
                    4,
                    Math.min(100, generation.task.progress ?? 4),
                  )}%`,
                }}
              />
            </div>

            {assetIds.length > 0 ? (
              <div className={`model-test-results ${mode}`}>
                {assetIds.map((assetId, index) =>
                  mode === "video" ? (
                    <video
                      key={assetId}
                      src={mediaAssetUrl(assetId)}
                      controls
                    />
                  ) : mode === "audio" ? (
                    generation.task?.taskType === "transcription" ? (
                      <a
                        key={assetId}
                        className="model-test-file-result"
                        href={mediaAssetUrl(assetId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={18} />
                        查看 / 下载字幕 JSON
                      </a>
                    ) : (
                      <audio
                        key={assetId}
                        src={mediaAssetUrl(assetId)}
                        controls
                      />
                    )
                  ) : (
                    <a
                      key={assetId}
                      href={mediaAssetUrl(assetId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={mediaAssetUrl(assetId)}
                        alt={`测试结果 ${index + 1}`}
                      />
                    </a>
                  ),
                )}
              </div>
            ) : generation.error ? (
              <div className="model-test-task-error">
                <CircleX size={17} />
                <p>{generation.error}</p>
              </div>
            ) : (
              <div className="model-test-empty">
                <LoaderCircle className="spin" size={22} />
                <strong>任务执行中</strong>
                <p>ComfyUI 完成后，结果会自动显示在这里。</p>
              </div>
            )}
          </div>
        ) : generation.error ? (
          <div className="model-test-task-error">
            <CircleX size={17} />
            <p>{generation.error}</p>
          </div>
        ) : (
          <div className="model-test-empty">
            <FlaskConical size={22} />
            <strong>等待测试</strong>
            <p>填写参数并发起测试后，这里会显示任务进度与生成结果。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function testModeFor(model: Model): keyof typeof testModeLabels | null {
  if (
    model.capabilities.some((capability) =>
      ["image_generation", "image_processing"].includes(capability),
    )
  ) {
    return "image";
  }
  if (
    model.capabilities.some((capability) =>
      ["video_generation", "video_processing"].includes(capability),
    )
  ) {
    return "video";
  }
  if (
    model.capabilities.some((capability) =>
      ["audio_processing", "transcription"].includes(capability),
    )
  ) {
    return "audio";
  }
  if (model.capabilities.includes("text")) return "text";
  return null;
}

function defaultPromptFor(mode: MediaMode) {
  if (mode === "image") {
    return "一只橘猫坐在窗边，电影感光线，细节清晰";
  }
  if (mode === "video") {
    return "镜头缓慢推进，一只橘猫看向窗外，电影感光线";
  }
  return "";
}

function taskStatusLabel(status: string) {
  return (
    {
      pending: "等待提交",
      queued: "排队中",
      running: "生成中",
      succeeded: "测试完成",
      failed: "测试失败",
      canceled: "已取消",
    }[status] ?? status
  );
}
