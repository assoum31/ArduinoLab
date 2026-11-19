import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  Lock,
  Printer,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { useApp } from '../../context/AppContext';
import { LESSONS, TRACK_META } from '../../data/lessons';
import { tLoc, translations } from '../../i18n/translations';
import { soundEngine } from '../../utils/sound';

export const CORE_CERT_LESSONS = 11;

const FALLBACK_CERT_ID_KEY = 'ardunolab_completion_id_v1';

function getOrCreateStableCompletionId(): string {
  try {
    const existing = localStorage.getItem(FALLBACK_CERT_ID_KEY);
    if (existing && /^ARD-\d{4}-[A-Z0-9]{6}$/.test(existing)) {
      return existing;
    }
  } catch {
    // ignore storage access issues
  }

  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const suffix = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 6)
    .toUpperCase();
  const generated = `ARD-${new Date().getFullYear()}-${suffix}`;
  try {
    localStorage.setItem(FALLBACK_CERT_ID_KEY, generated);
  } catch {
    // ignore
  }
  return generated;
}

interface CertificateModalProps {
  open: boolean;
  onClose: () => void;
  celebrationMode?: boolean;
}

export function CertificateModal({
  open,
  onClose,
  celebrationMode = false,
}: CertificateModalProps) {
  const {
    lang,
    profile,
    completedLessons,
    certificate,
    claimCertificate,
    platformConfig,
    isAdmin,
  } = useApp();

  const [recipientName, setRecipientName] = useState(
    certificate?.recipientName || profile.displayName || 'Arduino Maker',
  );
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const completedBuiltin = LESSONS.filter((l) =>
    completedLessons.includes(l.id),
  ).length;
  const coreCompleted = Math.min(completedBuiltin, CORE_CERT_LESSONS);
  const corePct = Math.round((coreCompleted / CORE_CERT_LESSONS) * 100);
  const completionPct = Math.round((completedBuiltin / LESSONS.length) * 100);
  const threshold = platformConfig.certThreshold || 100;
  const isUnlocked =
    Boolean(certificate) ||
    completedBuiltin >= CORE_CERT_LESSONS ||
    completionPct >= threshold ||
    isAdmin;

  const fallbackUniqueId = useMemo(() => getOrCreateStableCompletionId(), []);

  useEffect(() => {
    if (certificate?.recipientName) {
      setRecipientName(certificate.recipientName);
    } else if (profile.displayName) {
      setRecipientName(profile.displayName);
    }
  }, [certificate?.recipientName, profile.displayName]);

  const activeCert = {
    certificateCode: certificate?.certificateCode || fallbackUniqueId,
    recipientName: recipientName.trim() || certificate?.recipientName || profile.displayName,
    issuedBy: certificate?.issuedBy || platformConfig.certIssuerName || 'ArdunoLab Academy',
    completionPercent: certificate?.completionPercent || Math.max(corePct, completionPct),
    issuedAt: certificate?.issuedAt || new Date().toISOString(),
  };

  const formattedDate = new Date(activeCert.issuedAt).toLocaleDateString(
    lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  const displayLessonsCompleted = Math.max(completedBuiltin, CORE_CERT_LESSONS);

  const handleSaveName = async () => {
    if (!isUnlocked || !recipientName.trim()) return;
    setSaving(true);
    await claimCertificate(recipientName.trim());
    soundEngine.playSuccess();
    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeCert.certificateCode).catch(() => {});
    setCopiedCode(true);
    soundEngine.playSelect();
    setTimeout(() => setCopiedCode(false), 1800);
  };

  /**
   * Renders a high-DPI A4-landscape (2100x1485) printable ivory-parchment certificate
   * on an offscreen HTML5 Canvas so Arabic RTL, English, and French typography
   * export with identical fidelity to both Printable PDF and PNG.
   */
  const renderPrintableCertificateCanvas = async (): Promise<{
    canvas: HTMLCanvasElement;
    finalCode: string;
  } | null> => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }

    let certToRender = certificate;
    if (!certToRender) {
      certToRender = await claimCertificate(recipientName.trim());
    }
    const finalName =
      recipientName.trim() || certToRender?.recipientName || profile.displayName;
    const finalCode = certToRender?.certificateCode || activeCert.certificateCode;
    const issuer = platformConfig.certIssuerName || 'ArdunoLab Academy';
    const director = platformConfig.certDirectorName || 'Omar Farouk Berrahma';

    const W = 2100;
    const H = 1485;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Warm Ivory Printable Parchment Sheet
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#FFFDF7');
    bgGrad.addColorStop(0.5, '#FDFBF4');
    bgGrad.addColorStop(1, '#F8F4E8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle Watermark Pattern in center
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 135, 143, 0.045)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 360, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2 - 20, 315, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Outer Deep Arduino Teal Frame
    ctx.strokeStyle = '#00878F';
    ctx.lineWidth = 10;
    ctx.strokeRect(56, 56, W - 112, H - 112);

    // 3. Inner Antique Gold Double Hairline Border
    ctx.strokeStyle = '#C59B27';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(78, 78, W - 156, H - 156);
    ctx.strokeStyle = 'rgba(197, 155, 39, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(92, 92, W - 184, H - 184);

    // 4. Engraved Corner Filigree Brackets
    const drawCorner = (x: number, y: number, sx: number, sy: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.strokeStyle = '#00878F';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 56);
      ctx.lineTo(0, 0);
      ctx.lineTo(56, 0);
      ctx.stroke();
      ctx.fillStyle = '#C59B27';
      ctx.beginPath();
      ctx.arc(16, 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawCorner(106, 106, 1, 1);
    drawCorner(W - 106, 106, -1, 1);
    drawCorner(106, H - 106, 1, -1);
    drawCorner(W - 106, H - 106, -1, -1);

    // 5. Top Academy Crest
    ctx.fillStyle = '#00878F';
    ctx.beginPath();
    ctx.arc(W / 2, 198, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C59B27';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('∞', W / 2, 200);

    // Academy Issuer Line
    ctx.fillStyle = '#006E75';
    ctx.font = '700 28px "Inter", "Cairo", sans-serif';
    ctx.fillText(issuer.toUpperCase(), W / 2, 290);

    // Thin Gold Divider
    ctx.strokeStyle = '#C59B27';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 326);
    ctx.lineTo(W / 2 + 220, 326);
    ctx.stroke();

    // 6. Main Certificate Title
    ctx.fillStyle = '#0F172A';
    ctx.font =
      lang === 'ar'
        ? '800 66px "Cairo", sans-serif'
        : '700 68px Georgia, "Times New Roman", serif';
    ctx.fillText(
      lang === 'ar'
        ? 'شهادة إتمام مسار الأردوينو والأنظمة المدمجة'
        : lang === 'fr'
          ? 'CERTIFICAT DE RÉUSSITE ARDUINO'
          : 'CERTIFICATE OF COMPLETION',
      W / 2,
      408,
    );

    // Subtitle
    ctx.fillStyle = '#475569';
    ctx.font = '500 28px "Cairo", "Inter", sans-serif';
    ctx.fillText(
      lang === 'ar'
        ? 'تشهد أكاديمية أردوينولاب بأن المتعلم التالي قد أتم جميع الدروس الأساسية الـ 11 بنجاح وتميّز:'
        : lang === 'fr'
          ? 'Ce certificat officiel est décerné avec distinction pour avoir terminé les 11 leçons fondamentales à :'
          : 'This official credential proudly certifies that the following maker has completed all 11 core Arduino lessons:',
      W / 2,
      490,
    );

    // 7. Recipient Full Name
    ctx.fillStyle = '#0B2E33';
    ctx.font =
      lang === 'ar'
        ? '800 84px "Cairo", sans-serif'
        : '700 84px Georgia, "Times New Roman", serif';
    ctx.fillText(finalName, W / 2, 622);

    // Gold Engraved Rule under Name
    const ruleGrad = ctx.createLinearGradient(W / 2 - 440, 0, W / 2 + 440, 0);
    ruleGrad.addColorStop(0, 'rgba(197, 155, 39, 0)');
    ruleGrad.addColorStop(0.2, '#C59B27');
    ruleGrad.addColorStop(0.5, '#00878F');
    ruleGrad.addColorStop(0.8, '#C59B27');
    ruleGrad.addColorStop(1, 'rgba(197, 155, 39, 0)');
    ctx.strokeStyle = ruleGrad;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 440, 690);
    ctx.lineTo(W / 2 + 440, 690);
    ctx.stroke();

    // 8. Curriculum Summary
    ctx.fillStyle = '#334155';
    ctx.font = '600 26px "Cairo", "Inter", sans-serif';
    ctx.fillText(
      lang === 'ar'
        ? `إتقان الدوائر الرقمية · الإشارات التماثلية وPWM · المحركات والصوت · الحساسات الذكية (${displayLessonsCompleted} دروس مكتملة)`
        : lang === 'fr'
          ? `Électronique Numérique · Analogique & PWM · Actionneurs · Capteurs Intelligents (${displayLessonsCompleted} leçons validées)`
          : `Digital Circuits · Analog & PWM · Actuators & Sound · Smart Sensors (${displayLessonsCompleted} Lessons Completed)`,
      W / 2,
      768,
    );

    // 9. Station Seals Row
    const startX = W / 2 - 360;
    const stepX = 180;
    TRACK_META.forEach((tr, i) => {
      const cx = startX + i * stepX;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, 882, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tr.accent;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = tr.accent;
      ctx.font = '700 26px monospace';
      ctx.fillText(`S${tr.id}`, cx, 884);
    });

    // 10. Official Gold Seal Medallion (Center Bottom)
    const sealX = W / 2;
    const sealY = 1148;
    ctx.save();
    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(sealX, sealY, 72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9A7412';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#FFF7D6';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(sealX, sealY, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#1E293B';
    ctx.font = '800 20px monospace';
    ctx.fillText('VERIFIED', sealX, sealY - 12);
    ctx.font = '800 24px monospace';
    ctx.fillText('11/11', sealX, sealY + 18);
    ctx.restore();

    // 11. Left Verification Plaque: Completion ID & Date
    ctx.fillStyle = '#F1F5F9';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.fillRect(160, 1055, 590, 195);
    ctx.strokeRect(160, 1055, 590, 195);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#006E75';
    ctx.font = '700 22px monospace';
    ctx.fillText('UNIQUE COMPLETION ID', 196, 1102);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 38px monospace';
    ctx.fillText(finalCode, 196, 1152);

    ctx.fillStyle = '#475569';
    ctx.font = '500 22px "Cairo", "Inter", sans-serif';
    ctx.fillText(`ISSUED: ${formattedDate}  ·  ${profile.xp} XP`, 196, 1212);

    // 12. Right Signature Block
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'italic 46px Georgia, "Times New Roman", serif';
    ctx.fillText(director, W - 165, 1142);

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 620, 1178);
    ctx.lineTo(W - 165, 1178);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '600 22px "Cairo", "Inter", sans-serif';
    ctx.fillText(
      lang === 'ar'
        ? 'مدير الأكاديمية · أردوينولاب'
        : lang === 'fr'
          ? 'Directeur Académique · ArdunoLab'
          : 'Academy Director · ArdunoLab',
      W - 165,
      1218,
    );

    return { canvas, finalCode };
  };

  const handleDownloadPdf = async () => {
    if (!isUnlocked || exporting) return;
    setExporting('pdf');
    try {
      const rendered = await renderPrintableCertificateCanvas();
      if (!rendered) return;
      const imgData = rendered.canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save(`ArdunoLab-Certificate-${rendered.finalCode}.pdf`);
      soundEngine.playSuccess();
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPng = async () => {
    if (!isUnlocked || exporting) return;
    setExporting('png');
    try {
      const rendered = await renderPrintableCertificateCanvas();
      if (!rendered) return;
      const url = rendered.canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `ArdunoLab-Certificate-${rendered.finalCode}.png`;
      a.click();
      soundEngine.playSuccess();
    } finally {
      setExporting(null);
    }
  };

  const dialogTitle =
    celebrationMode && isUnlocked
      ? tLoc(translations.lessons.lessonCompleteTitle, lang)
      : tLoc(translations.lessons.certificateTitle, lang);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dialogTitle}
      className="max-w-3xl"
    >
      <div className="space-y-5">
        {!isUnlocked ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3.5">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {tLoc(translations.lessons.lockedCertificate, lang)}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {lang === 'ar'
                ? `أكملت ${coreCompleted} من أصل ${CORE_CERT_LESSONS} دروس أساسية (${corePct}%). أتمم جميع الدروس الـ 11 لفتح حوار إتمام المسار وشهادتك الرقمية القابلة للطباعة.`
                : lang === 'fr'
                  ? `Vous avez terminé ${coreCompleted} sur ${CORE_CERT_LESSONS} leçons fondamentales (${corePct}%). Terminez les 11 leçons pour débloquer votre certificat imprimable.`
                  : `You have completed ${coreCompleted} of ${CORE_CERT_LESSONS} core lessons (${corePct}%). Finish all 11 core lessons to unlock your printable digital certificate and unique Completion ID.`}
            </p>
            <div className="max-w-xs mx-auto h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-[#00878F] transition-all duration-300"
                style={{ width: `${corePct}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Celebratory Banner when auto-triggered after completing the 11th lesson */}
            {celebrationMode && (
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#00878F]/10 to-amber-500/10 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{tLoc(translations.lessons.lessonCompleteTitle, lang)}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {tLoc(translations.lessons.lessonCompleteSubtitle, lang)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 text-[#00878F] dark:text-[#22c6cf]">
                  {displayLessonsCompleted}/{LESSONS.length} · {profile.xp} XP
                </div>
              </div>
            )}

            {/* Printable-Style Ivory Parchment Certificate Sheet */}
            <div className="relative rounded-xl bg-[#FFFDF7] text-slate-900 p-5 sm:p-8 border-[3px] border-[#00878F] shadow-xl overflow-hidden">
              {/* Inner Antique Gold Engraved Frame */}
              <div className="absolute inset-2.5 rounded-lg border-[1.5px] border-[#C59B27]/80 pointer-events-none" />
              <div className="absolute inset-4 rounded border border-[#C59B27]/35 pointer-events-none" />

              {/* Decorative Corner Brackets */}
              <span
                aria-hidden="true"
                className="absolute top-3.5 start-3.5 w-4 h-4 border-t-2 border-s-2 border-[#00878F]"
              />
              <span
                aria-hidden="true"
                className="absolute top-3.5 end-3.5 w-4 h-4 border-t-2 border-e-2 border-[#00878F]"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-3.5 start-3.5 w-4 h-4 border-b-2 border-s-2 border-[#00878F]"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-3.5 end-3.5 w-4 h-4 border-b-2 border-e-2 border-[#00878F]"
              />

              <div className="relative z-10 text-center space-y-3.5 px-2 sm:px-4">
                {/* Academy Crest */}
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-[#00878F] border-2 border-[#C59B27] text-white flex items-center justify-center font-mono text-xl font-bold shadow-sm">
                    ∞
                  </div>
                  <div className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-[#006E75]">
                    {activeCert.issuedBy}
                  </div>
                </div>

                {/* Diploma Heading */}
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-serif font-extrabold tracking-tight text-slate-900">
                    {lang === 'ar'
                      ? 'شهادة إتمام مسار الأردوينو والأنظمة المدمجة'
                      : lang === 'fr'
                        ? 'Certificat de Réussite Arduino'
                        : 'Certificate of Completion'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-lg mx-auto">
                    {lang === 'ar'
                      ? 'تُمنح هذه الشهادة المعتمدة تقديراً لإتمام جميع الدروس الأساسية الـ 11 بنجاح إلى:'
                      : lang === 'fr'
                        ? 'Décerné avec distinction pour avoir complété les 11 leçons fondamentales à :'
                        : 'Proudly awarded in recognition of completing all 11 core Arduino engineering lessons to:'}
                  </p>
                </div>

                {/* Recipient Name */}
                <div className="py-1.5">
                  <div className="text-2xl sm:text-3xl font-serif font-extrabold text-[#0B2E33] tracking-tight break-words">
                    {recipientName.trim() || profile.displayName}
                  </div>
                  <div className="w-56 h-[2px] bg-gradient-to-r from-transparent via-[#C59B27] to-transparent mx-auto mt-2" />
                </div>

                {/* Station Seals */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {TRACK_META.map((tr) => (
                    <div
                      key={tr.id}
                      className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold bg-white shadow-xs border-2"
                      style={{ borderColor: tr.accent, color: tr.accent }}
                      title={tLoc(tr.badgeName, lang)}
                    >
                      S{tr.id}
                    </div>
                  ))}
                </div>

                {/* Printable Verification Footer */}
                <div className="pt-4 mt-2 border-t border-slate-300/80 grid grid-cols-1 sm:grid-cols-3 items-center gap-4 text-[11px]">
                  {/* Unique Completion ID Block */}
                  <div className="text-start rounded-lg bg-slate-100/90 border border-slate-200 px-3 py-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#006E75] font-bold">
                      {tLoc(translations.lessons.completionIdLabel, lang)}
                    </div>
                    <div
                      dir="ltr"
                      className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-slate-900 mt-0.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{activeCert.certificateCode}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{formattedDate}</div>
                  </div>

                  {/* Gold Verification Seal */}
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border-2 border-amber-700/60 shadow-sm flex flex-col items-center justify-center text-slate-950">
                      <span className="font-mono text-[8px] font-extrabold tracking-widest leading-none">
                        VERIFIED
                      </span>
                      <span className="font-mono text-xs font-black leading-tight mt-0.5">
                        11/11
                      </span>
                    </div>
                  </div>

                  {/* Academy Director Signature */}
                  <div className="text-end">
                    <div className="font-serif italic text-base font-semibold text-slate-900">
                      {platformConfig.certDirectorName || 'Omar Farouk Berrahma'}
                    </div>
                    <div className="h-px bg-slate-400/70 w-36 ms-auto my-1" />
                    <div className="text-[10px] font-semibold text-slate-600">
                      {lang === 'ar'
                        ? 'مدير الأكاديمية · أردوينولاب'
                        : lang === 'fr'
                          ? 'Directeur · ArdunoLab'
                          : 'Academy Director · ArdunoLab'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Name Customization + Printable Export Actions */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tLoc(translations.lessons.recipientLabel, lang)}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={
                        lang === 'ar' ? 'اكتب اسمك الكامل هنا...' : 'Enter your full name...'
                      }
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00878F]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveName}
                      disabled={saving}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {savedNotice
                          ? lang === 'ar'
                            ? 'تم الحفظ'
                            : 'Saved'
                          : lang === 'ar'
                            ? 'تحديث الاسم'
                            : 'Save Name'}
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Copy Unique Completion ID */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="shrink-0 h-9"
                  title={tLoc(translations.lessons.completionIdLabel, lang)}
                >
                  {copiedCode ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="font-mono text-xs">
                    {copiedCode
                      ? tLoc(translations.lessons.copiedId, lang)
                      : activeCert.certificateCode}
                  </span>
                </Button>
              </div>

              {/* Primary Printable Export Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={exporting !== null}
                  className="w-full"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {exporting === 'pdf'
                      ? lang === 'ar'
                        ? 'جاري تجهيز PDF للطباعة...'
                        : 'Preparing Printable PDF...'
                      : tLoc(translations.lessons.downloadPdf, lang)}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadPng}
                  disabled={exporting !== null}
                  className="w-full"
                >
                  {exporting === 'png' ? (
                    <FileDown className="w-4 h-4 animate-bounce" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{tLoc(translations.lessons.downloadPng, lang)}</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'شهادتك موثّقة برقم إتمام فريد وجاهزة للطباعة بحجم A4 أفقي وتظهر بجانب اسمك في لوحة المتصدرين.'
                  : lang === 'fr'
                    ? 'Votre certificat A4 imprimable porte un identifiant unique vérifié et apparaît dans le classement.'
                    : 'Your A4 landscape printable certificate carries a unique verified Completion ID and appears beside your name on the Leaderboard.'}
              </span>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
