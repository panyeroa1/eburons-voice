
import React, { useState } from 'react';
import { Settings as SettingsIcon, ChevronDown, FileText, CheckCircle, Mic, Globe, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const [topic, setTopic] = useState<string>(() => {
      return localStorage.getItem('eburon_topic') || 'Trafficking Early Warning System';
  });

  const [voiceStyle, setVoiceStyle] = useState<string>(() => {
      return localStorage.getItem('eburon_voice_style') || 'Dutch Flemish expressive';
  });

  const [language, setLanguage] = useState<string>(() => {
      return localStorage.getItem('eburon_language') || 'English';
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
      localStorage.setItem('eburon_topic', topic);
      localStorage.setItem('eburon_voice_style', voiceStyle);
      localStorage.setItem('eburon_language', language);
      
      setIsSaved(true);
      // Hide message after 3 seconds
      setTimeout(() => setIsSaved(false), 3000);
  };

  const voiceStyles = [
    "Dutch Flemish expressive",
    "Tagalog English Mix",
    "Turkish Local Language",
    "Arabic Accent UAE National",
    "French Grown Native Speaking",
    "Malayalam Indian Native"
  ];

  const languages = [
    "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", 
    "Bosnian", "Bulgarian", "Catalan", "Cebuano", "Chinese (Simplified)", "Chinese (Traditional)", "Corsican", 
    "Croatian", "Czech", "Danish", "Dutch", "English", "Esperanto", "Estonian", "Finnish", "French", "Frisian", 
    "Galician", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hindi", 
    "Hmong", "Hungarian", "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada", 
    "Kazakh", "Khmer", "Kinyarwanda", "Korean", "Kurdish", "Kyrgyz", "Lao", "Latin", "Latvian", "Lithuanian", 
    "Luxembourgish", "Macedonian", "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian", 
    "Myanmar (Burmese)", "Nepali", "Norwegian", "Nyanja (Chichewa)", "Odia (Oriya)", "Pashto", "Persian", "Polish", 
    "Portuguese", "Punjabi", "Romanian", "Russian", "Samoan", "Scots Gaelic", "Serbian", "Sesotho", "Shona", 
    "Sindhi", "Sinhala (Sinhalese)", "Slovak", "Slovenian", "Somali", "Spanish", "Sundanese", "Swahili", "Swedish", 
    "Tagalog (Filipino)", "Tajik", "Tamil", "Tatar", "Telugu", "Thai", "Turkish", "Turkmen", "Ukrainian", "Urdu", 
    "Uyghur", "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu"
  ];

  return (
    <div className="h-full bg-gradient-to-b from-zinc-900 to-black text-white flex flex-col relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none z-0" 
           style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Header */}
      <div className="p-6 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-md z-10">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <SettingsIcon className="w-6 h-6 text-amber-500" />
          System Configuration
        </h2>
        <p className="text-xs text-zinc-400 mt-1 font-mono">KNOWLEDGE BASE & VOICE PARAMETERS</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto z-10">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Topic Selector */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Active Knowledge Topic
                </label>
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20">
                    READY
                </span>
            </div>
            
            <div className="relative group">
              <select 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-4 appearance-none focus:border-amber-500 outline-none text-white font-mono text-sm transition-colors cursor-pointer group-hover:border-zinc-600"
              >
                <option value="Trafficking Early Warning System">Trafficking Early Warning System</option>
                <option value="Decobu Messenger">Decobu Messenger Security</option>
                <option value="Eburon Architecture" disabled>Eburon Architecture (Coming Soon)</option>
                <option value="Voice Synthesis" disabled>Voice Synthesis Protocols (Coming Soon)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Voice Persona */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice Style & Tone
                </label>
            </div>
            
            <div className="relative group">
              <select 
                value={voiceStyle}
                onChange={(e) => setVoiceStyle(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-4 appearance-none focus:border-amber-500 outline-none text-white font-mono text-sm transition-colors cursor-pointer group-hover:border-zinc-600"
              >
                {voiceStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            </div>
            <p className="text-xs text-zinc-500 px-1">Determines the accent, intonation, and cultural mannerisms of the voice.</p>
          </div>

          {/* Language */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800 p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Spoken Language
                </label>
            </div>
            
            <div className="relative group">
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-4 appearance-none focus:border-amber-500 outline-none text-white font-mono text-sm transition-colors cursor-pointer group-hover:border-zinc-600"
              >
                 {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            </div>
             <p className="text-xs text-zinc-500 px-1">
                <span className="text-amber-600">Note:</span> If Language differs from Voice Style, the agent will speak this language with the selected accent.
            </p>
          </div>

          {/* Save Action Area */}
          <div className="pt-6 flex flex-col items-center gap-4 border-t border-zinc-800/50 mt-8">
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
            >
                <Save className="w-4 h-4" />
                Save Configuration
            </button>

            {isSaved && (
                <div className="flex items-center gap-2 text-green-400 bg-green-900/20 px-4 py-2 rounded-full border border-green-900/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">System configuration updated successfully.</span>
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
