/** * 学习LanguageSetcomponent * 左侧a母语，右侧a目标Language，支持国旗切换*/

"use client";

import {
  SettingsCard,
  SettingsRow,
  SettingsRowContent,
  SettingsSection,
} from "@/components/features/settings/SettingsCard";
import { useTranscriptionLanguage } from "@/components/layout/contexts/TranscriptionLanguageContext";

export function LearningLanguageSection() {
  const {
    learningLanguage,
    setLearningLanguage,
    getSupportedLanguages,
    getTranscriptionLanguages,
  } = useTranscriptionLanguage();
  const supportedLanguages = getSupportedLanguages();
  const transcriptionLanguages = getTranscriptionLanguages();

  const handleNativeLanguageChange = (languageCode: string) => {
    setLearningLanguage({
      ...learningLanguage,
      nativeLanguage: languageCode,
    });
  };

  const handleTargetLanguageChange = (languageCode: string) => {
    setLearningLanguage({
      ...learningLanguage,
      targetLanguage: languageCode,
    });
  };

  return (
    <SettingsSection title="学习语言">
      <SettingsCard>
        {/*母语Language选择*/}
        <SettingsRow>
          <SettingsRowContent title="母语" description="转录时翻译的目标语言" />
          <div className="flex items-center gap-2">
            {Object.entries(supportedLanguages).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleNativeLanguageChange(code)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg text-2xl
                  transition-all duration-200
                  ${
                    learningLanguage.nativeLanguage === code
                      ? "bg-primary/20 ring-2 ring-primary scale-110"
                      : "bg-muted/50 hover:bg-muted hover:scale-105"
                  }
                `}
                title={config.name}
                aria-label={`选择${config.name}作为母语`}
                aria-pressed={learningLanguage.nativeLanguage === code}
              >
                {config.flag}
              </button>
            ))}
          </div>
        </SettingsRow>

        {/*目标Language选择*/}
        <SettingsRow>
          <SettingsRowContent title="目标语言" description="转录时API使用的语言参数" />
          <div className="flex items-center gap-2">
            {Object.entries(transcriptionLanguages).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => handleTargetLanguageChange(code)}
                className={`
                  flex items-center justify-center w-10 h-10 rounded-lg text-2xl
                  transition-all duration-200
                  ${
                    learningLanguage.targetLanguage === code
                      ? "bg-primary/20 ring-2 ring-primary scale-110"
                      : "bg-muted/50 hover:bg-muted hover:scale-105"
                  }
                `}
                title={config.name}
                aria-label={`选择${config.name}作为目标语言`}
                aria-pressed={learningLanguage.targetLanguage === code}
              >
                {config.flag}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
