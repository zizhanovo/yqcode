#!/usr/bin/env node

import prompts from 'prompts';
import { spawn } from 'child_process';
import kleur from 'kleur';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

type Language = 'en' | 'zh' | 'ja';
type Target = 'codex' | 'claude';

type Messages = {
  welcome: string;
  languagePrompt: string;
  languageChoices: Array<{ value: Language; title: string; description?: string }>;
  cancel: string;
  targetPrompt: string;
  targets: Record<Target, string>;
  startInstall: (command: string) => string;
  installSuccess: string;
  installFailed: string;
  confirmOverwrite: string;
  declineOverwrite: string;
  installConfirm: (command: string) => string;
  installSkipped: string;
  yes: string;
  no: string;
  codexModelPrompt: string;
  codexModels: Array<{ value: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-haiku-20240307' | 'claude-3-sonnet-20240229'; title: string; description?: string }>;
  apiKeyPrompt: string;
  apiKeyHint: string;
  apiKeyValidation: string;
  claudeBaseUrlPrompt: string;
  claudeBaseUrlHint: string;
  baseUrlValidation: string;
  writingConfig: string;
  backupDone: (file: string) => string;
  noBackupNeeded: (file: string) => string;
  configWritten: (file: string) => string;
  finished: (targetLabel: string) => string;
  docsHint: string;
};

const API_KEY_URL = 'https://zizhanai.com/user';
const CODEX_BASE_URL = 'https://zizhanai.com/v1';
const CLAUDE_BASE_URL_DEFAULT = 'https://zizhanai.com/v1';

const TRANSLATIONS: Record<Language, Messages> = {
  en: {
    welcome: '🚀 Ready to wire CodeX or Claude Code to 月栖AI? Let\'s get your CLI in shape.',
    languagePrompt: 'Select the language for this setup wizard',
    languageChoices: [
      { value: 'en', title: 'English (Default)' },
      { value: 'zh', title: '简体中文' },
      { value: 'ja', title: '日本語' }
    ],
    cancel: 'Setup cancelled. Nothing was changed.',
    targetPrompt: 'Which CLI do you want to configure today?',
    targets: {
      codex: 'CodeX (OpenAI\'s coding assistant)',
      claude: 'Claude Code (Anthropic)'
    },
    startInstall: (command) => `Running ${command} to make sure everything is up to date...`,
    installSuccess: 'Installation check completed.',
    installFailed: 'Installation failed. Please review the errors above and run the wizard again.',
    confirmOverwrite:
      'We will backup your current configuration (.bak files) and write the 月栖AI settings. Continue?',
    declineOverwrite: 'Understood. No files were touched.',
    installConfirm: (command) => `Run ${command} now to ensure you have the latest release?`,
    installSkipped: 'Skipped installation. We\'ll use the version already on your machine.',
    yes: 'Yes',
    no: 'No',
    codexModelPrompt: 'Pick the default model to set in config.toml',
    codexModels: [
      { value: 'gpt-4', title: 'gpt-4 (latest, optimized for coding - recommended)' },
      { value: 'gpt-3.5-turbo', title: 'gpt-3.5-turbo (general purpose)' },
      { value: 'claude-3-haiku-20240307', title: 'claude-3-haiku-20240307 (fastest, economical)' },
      { value: 'claude-3-sonnet-20240229', title: 'claude-3-sonnet-20240229 (balanced performance)' }
    ],
    apiKeyPrompt: `Paste your 月栖AI API key (open ${API_KEY_URL} if you need to create one)`,
    apiKeyHint: 'Your API key is stored locally on this device only.',
    apiKeyValidation: 'Please enter a non-empty API key.',
    claudeBaseUrlPrompt: 'Enter the Claude Code base URL to use',
    claudeBaseUrlHint: `Press enter to use ${CLAUDE_BASE_URL_DEFAULT}`,
    baseUrlValidation: 'Please enter a valid base URL.',
    writingConfig: 'Writing configuration files...',
    backupDone: (file) => `Backup saved: ${file}`,
    noBackupNeeded: (file) => `No existing file found at ${file}.`,
    configWritten: (file) => `Updated ${file}`,
    finished: (targetLabel) => `✅ All done! ${targetLabel} is now configured for 月栖AI.`,
    docsHint: 'Tip: run `npx yqcode` anytime you want to switch setups again.'
  },
  zh: {
    welcome: '🚀 开始把 CodeX 或 Claude Code 接入 月栖AI，一起完成配置吧。',
    languagePrompt: '请选择向导语言',
    languageChoices: [
      { value: 'en', title: 'English (默认英语)' },
      { value: 'zh', title: '简体中文' },
      { value: 'ja', title: '日本語 / 日语' }
    ],
    cancel: '已取消，文件未做任何修改。',
    targetPrompt: '你想要配置哪一个 CLI？',
    targets: {
      codex: 'CodeX（OpenAI 代码助手）',
      claude: 'Claude Code（Anthropic）'
    },
    startInstall: (command) => `正在执行 ${command}，确保 CLI 已安装且为最新版本……`,
    installSuccess: '安装检查完成。',
    installFailed: '安装失败，请检查上方输出后重新运行向导。',
    confirmOverwrite: '将会先备份（*.bak）再覆写当前配置文件，是否继续？',
    declineOverwrite: '明白，未对文件进行任何更改。',
    installConfirm: (command) => `是否现在执行 ${command} 以确保使用最新版本？`,
    installSkipped: '已跳过安装，将使用你当前的 CLI 版本。',
    yes: '是',
    no: '否',
    codexModelPrompt: '请选择默认模型（写入 config.toml）',
    codexModels: [
      { value: 'gpt-4', title: 'gpt-4（最新，面向 CodeX 场景优化，推荐）' },
      { value: 'gpt-3.5-turbo', title: 'gpt-3.5-turbo（通用模型）' },
      { value: 'claude-3-haiku-20240307', title: 'claude-3-haiku-20240307（最快，经济实惠）' },
      { value: 'claude-3-sonnet-20240229', title: 'claude-3-sonnet-20240229（平衡性能）' }
    ],
    apiKeyPrompt: `请输入你的 月栖AI API Key（如需创建，请访问 ${API_KEY_URL}）`,
    apiKeyHint: '密钥只会保存在本机。',
    apiKeyValidation: 'API Key 不能为空。',
    claudeBaseUrlPrompt: '请输入 Claude Code 的 Base URL',
    claudeBaseUrlHint: `直接回车使用默认地址：${CLAUDE_BASE_URL_DEFAULT}`,
    baseUrlValidation: 'Base URL 不能为空。',
    writingConfig: '正在写入配置文件……',
    backupDone: (file) => `已备份：${file}`,
    noBackupNeeded: (file) => `未在 ${file} 发现历史文件。`,
    configWritten: (file) => `已更新 ${file}`,
    finished: (targetLabel) => `✅ 完成！${targetLabel} 已配置为使用 月栖AI。`,
    docsHint: '提示：再次执行 `npx yqcode` 可以重新配置。'
  },
  ja: {
    welcome: '🚀 CodeX または Claude Code を 月栖AI へ接続します。セットアップを始めましょう。',
    languagePrompt: 'ウィザードで使用する言語を選択してください',
    languageChoices: [
      { value: 'en', title: 'English (デフォルト)' },
      { value: 'zh', title: '简体中文 / 中国語' },
      { value: 'ja', title: '日本語' }
    ],
    cancel: 'セットアップを中止しました。ファイルは変更されていません。',
    targetPrompt: 'どの CLI を設定しますか？',
    targets: {
      codex: 'CodeX（OpenAI のコーディング支援）',
      claude: 'Claude Code（Anthropic）'
    },
    startInstall: (command) => `${command} を実行し、最新バージョンが入っているか確認します…`,
    installSuccess: 'インストール確認が完了しました。',
    installFailed: 'インストールに失敗しました。ログを確認してから再実行してください。',
    confirmOverwrite: '既存の設定を .bak にバックアップしてから 月栖AI 設定を書き込みます。続行しますか？',
    declineOverwrite: '了解しました。何も変更していません。',
    installConfirm: (command) => `${command} を今すぐ実行して最新版に更新しますか？`,
    installSkipped: 'インストールをスキップしました。現在の CLI バージョンを使用します。',
    yes: 'はい',
    no: 'いいえ',
    codexModelPrompt: 'config.toml に設定するデフォルトモデルを選択してください',
    codexModels: [
      { value: 'gpt-4', title: 'gpt-4（最新・コード向け最適化 推奨）' },
      { value: 'gpt-3.5-turbo', title: 'gpt-3.5-turbo（汎用モデル）' },
      { value: 'claude-3-haiku-20240307', title: 'claude-3-haiku-20240307（高速・経済的）' },
      { value: 'claude-3-sonnet-20240229', title: 'claude-3-sonnet-20240229（バランス性能）' }
    ],
    apiKeyPrompt: `月栖AI の API Key を入力してください（必要なら ${API_KEY_URL} で作成できます）`,
    apiKeyHint: 'キーはこの端末にのみ保存されます。',
    apiKeyValidation: 'API Key を入力してください。',
    claudeBaseUrlPrompt: 'Claude Code で使用する Base URL を入力してください',
    claudeBaseUrlHint: `Enter を押すとデフォルト ${CLAUDE_BASE_URL_DEFAULT} を使用します。`,
    baseUrlValidation: 'Base URL を入力してください。',
    writingConfig: '設定ファイルを書き込んでいます…',
    backupDone: (file) => `バックアップ完了: ${file}`,
    noBackupNeeded: (file) => `${file} に既存ファイルはありませんでした。`,
    configWritten: (file) => `${file} を更新しました`,
    finished: (targetLabel) => `✅ 完了しました！${targetLabel} は 月栖AI で利用できます。`,
    docsHint: '`npx yqcode` を再度実行すれば再設定できます。'
  }
};

const detectLanguage = (): Language => {
  const env =
    process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || '';
  if (env.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  if (env.toLowerCase().startsWith('ja')) {
    return 'ja';
  }
  return 'en';
};

const formatTimestamp = (): string => {
  const date = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    '-' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const ensureDir = async (filePath: string) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const backupFile = async (filePath: string): Promise<string | null> => {
  if (!existsSync(filePath)) {
    return null;
  }
  const backupPath = `${filePath}.${formatTimestamp()}.bak`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
};

const writeFileSafely = async (filePath: string, content: string) => {
  await ensureDir(filePath);
  await fs.writeFile(filePath, content, 'utf8');
};

const runInstallCommand = async (command: string, args: string[], lang: Language): Promise<boolean> => {
  const messages = TRANSLATIONS[lang];
  console.log();
  const printable = [command, ...args].join(' ');
  console.log(kleur.cyan(messages.startInstall(printable)));
  return await new Promise<boolean>((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('error', (error) => {
      console.error(kleur.red(messages.installFailed));
      console.error(error);
      resolve(false);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(kleur.green(messages.installSuccess));
        resolve(true);
      } else {
        console.error(kleur.red(messages.installFailed));
        resolve(false);
      }
    });
  });
};

const onCancel = (lang: Language) => {
  const messages = TRANSLATIONS[lang];
  console.log();
  console.log(kleur.yellow(messages.cancel));
  process.exit(0);
};

const configureCodex = async (lang: Language) => {
  const messages = TRANSLATIONS[lang];

  const codexInstallArgs = ['install', '-g', '@openai/codex'];
  const codexInstallCommand = ['npm', ...codexInstallArgs];
  const { runInstall } = await prompts(
    {
      type: 'toggle',
      name: 'runInstall',
      message: messages.installConfirm(codexInstallCommand.join(' ')),
      initial: true,
      active: messages.yes,
      inactive: messages.no
    },
    { onCancel: () => onCancel(lang) }
  );

  if (runInstall) {
    const installOk = await runInstallCommand('npm', codexInstallArgs, lang);
    if (!installOk) {
      process.exit(1);
    }
  } else {
    console.log(kleur.yellow(messages.installSkipped));
  }

  const targetLabel = messages.targets.codex;

  const overwriteAnswer = await prompts(
    {
      type: 'toggle',
      name: 'confirm',
      message: messages.confirmOverwrite,
      initial: true,
      active: messages.yes,
      inactive: messages.no
    },
    { onCancel: () => onCancel(lang) }
  );

  if (!overwriteAnswer.confirm) {
    console.log(kleur.yellow(messages.declineOverwrite));
    process.exit(0);
  }

  const { model } = await prompts(
    {
      type: 'select',
      name: 'model',
      message: messages.codexModelPrompt,
      choices: messages.codexModels,
      initial: 0
    },
    { onCancel: () => onCancel(lang) }
  );

  const selectedModel = (model as string) || 'gpt-4';

  const { apiKey } = await prompts(
    [
      {
        type: 'password',
        name: 'apiKey',
        message: `${messages.apiKeyPrompt}\n`,
        validate: (value: string) => (value.trim().length > 0 ? true : messages.apiKeyValidation),
        hint: messages.apiKeyHint
      }
    ],
    { onCancel: () => onCancel(lang) }
  );

  const sanitizedApiKey = (apiKey as string).trim();

  const configPath = path.join(homedir(), '.codex', 'config.toml');
  const authPath = path.join(homedir(), '.codex', 'auth.json');

  console.log();
  console.log(kleur.cyan(messages.writingConfig));

  const configBackup = await backupFile(configPath);
  if (configBackup) {
    console.log(kleur.gray(messages.backupDone(configBackup)));
  } else {
    console.log(kleur.gray(messages.noBackupNeeded(configPath)));
  }

  const authBackup = await backupFile(authPath);
  if (authBackup) {
    console.log(kleur.gray(messages.backupDone(authBackup)));
  } else {
    console.log(kleur.gray(messages.noBackupNeeded(authPath)));
  }

  // New-API compatible config
  const configContent = `model_provider = "openai"\nmodel = "${selectedModel}"\nmodel_reasoning_effort = "high"\ndisable_response_storage = true\npreferred_auth_method = "apikey"\n\n[model_providers.openai]\nname = "openai"\nbase_url = "${CODEX_BASE_URL}"\nwire_api = "chat_completions"\n`;

  const authContent = JSON.stringify({ OPENAI_API_KEY: sanitizedApiKey }, null, 2) + '\n';

  await writeFileSafely(configPath, configContent);
  await writeFileSafely(authPath, authContent);

  console.log(kleur.green(messages.configWritten(configPath)));
  console.log(kleur.green(messages.configWritten(authPath)));
  console.log();
  console.log(kleur.bold().green(messages.finished(targetLabel)));
  console.log(kleur.gray(messages.docsHint));
};

const configureClaude = async (lang: Language) => {
  const messages = TRANSLATIONS[lang];

  const claudeInstallArgs = ['install', '-g', '@anthropic-ai/claude-code'];
  const claudeInstallCommand = ['npm', ...claudeInstallArgs];
  const { runInstall } = await prompts(
    {
      type: 'toggle',
      name: 'runInstall',
      message: messages.installConfirm(claudeInstallCommand.join(' ')),
      initial: true,
      active: messages.yes,
      inactive: messages.no
    },
    { onCancel: () => onCancel(lang) }
  );

  if (runInstall) {
    const installOk = await runInstallCommand('npm', claudeInstallArgs, lang);
    if (!installOk) {
      process.exit(1);
    }
  } else {
    console.log(kleur.yellow(messages.installSkipped));
  }

  const targetLabel = messages.targets.claude;

  const overwriteAnswer = await prompts(
    {
      type: 'toggle',
      name: 'confirm',
      message: messages.confirmOverwrite,
      initial: true,
      active: messages.yes,
      inactive: messages.no
    },
    { onCancel: () => onCancel(lang) }
  );

  if (!overwriteAnswer.confirm) {
    console.log(kleur.yellow(messages.declineOverwrite));
    process.exit(0);
  }

  const { apiKey, baseUrl } = await prompts(
    [
      {
        type: 'password',
        name: 'apiKey',
        message: `${messages.apiKeyPrompt}\n`,
        validate: (value: string) => (value.trim().length > 0 ? true : messages.apiKeyValidation),
        hint: messages.apiKeyHint
      },
      {
        type: 'text',
        name: 'baseUrl',
        message: messages.claudeBaseUrlPrompt,
        initial: CLAUDE_BASE_URL_DEFAULT,
        hint: messages.claudeBaseUrlHint,
        validate: (value: string) => {
          const trimmed = value.trim();
          try {
            new URL(trimmed);
            return true;
          } catch {
            return messages.baseUrlValidation;
          }
        }
      }
    ],
    { onCancel: () => onCancel(lang) }
  );

  const sanitizedApiKey = (apiKey as string).trim();
  const normalizedBaseUrl = (() => {
    const trimmed = (baseUrl as string).trim();
    if (!trimmed.endsWith('/')) {
      return `${trimmed}/`;
    }
    return trimmed;
  })();

  const settingsPath = path.join(homedir(), '.claude', 'settings.json');

  console.log();
  console.log(kleur.cyan(messages.writingConfig));

  const settingsBackup = await backupFile(settingsPath);
  if (settingsBackup) {
    console.log(kleur.gray(messages.backupDone(settingsBackup)));
  } else {
    console.log(kleur.gray(messages.noBackupNeeded(settingsPath)));
  }

  const settingsContent = JSON.stringify(
    {
      env: {
        DISABLE_TELEMETRY: '1',
        OTEL_METRICS_EXPORTER: 'otlp',
        ANTHROPIC_API_KEY: sanitizedApiKey,
        ANTHROPIC_BASE_URL: normalizedBaseUrl,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'
      },
      includeCoAuthoredBy: false,
      apiKeyHelper: `echo ${sanitizedApiKey}`,
      permissions: {
        allow: [] as string[],
        deny: [] as string[]
      }
    },
    null,
    2
  );

  await writeFileSafely(settingsPath, settingsContent + '\n');

  console.log(kleur.green(messages.configWritten(settingsPath)));
  console.log();
  console.log(kleur.bold().green(messages.finished(targetLabel)));
  console.log(kleur.gray(messages.docsHint));
};

const main = async () => {
  const defaultLang = detectLanguage();
  const initialChoiceIndex = TRANSLATIONS[defaultLang].languageChoices.findIndex(
    (choice) => choice.value === defaultLang
  );

  const languageChoice = await prompts(
    {
      type: 'select',
      name: 'language',
      message: TRANSLATIONS[defaultLang].languagePrompt,
      choices: TRANSLATIONS[defaultLang].languageChoices,
      initial: initialChoiceIndex >= 0 ? initialChoiceIndex : 0
    },
    { onCancel: () => onCancel(defaultLang) }
  );

  const lang = (languageChoice.language || defaultLang) as Language;
  const messages = TRANSLATIONS[lang];

  console.log();
  console.log(kleur.bold().magenta(messages.welcome));
  console.log();

  const { target } = await prompts(
    {
      type: 'select',
      name: 'target',
      message: messages.targetPrompt,
      choices: [
        { title: messages.targets.codex, value: 'codex' },
        { title: messages.targets.claude, value: 'claude' }
      ],
      initial: 0
    },
    { onCancel: () => onCancel(lang) }
  );

  if (target === 'codex') {
    await configureCodex(lang);
  } else if (target === 'claude') {
    await configureClaude(lang);
  } else {
    onCancel(lang);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});