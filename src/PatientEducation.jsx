import { useState, useMemo } from "react";

// ── Styles (matches App.jsx theme) ─────────────────────────────────
const S = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  muted: "#64748b",
  text: "#e2e8f0",
  bright: "#f1f5f9",
  accent: "#6366f1",
  accentLight: "#a5b4fc",
  green: "#4ade80",
  amber: "#f59e0b",
  font: "Georgia, serif",
  mono: "monospace",
};

// ── Categories ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "injection", label: "Injections" },
  { id: "procedure", label: "Procedures" },
  { id: "condition", label: "Conditions" },
];

const LANGUAGES = [
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
  { id: "vi", label: "VI" },
  { id: "pt", label: "PT" },
];

// ── Handout library ────────────────────────────────────────────────
// Each handout has content keyed by language code
const HANDOUTS = [
  // ═══════════════════════════════════════════════════════════════════
  // INJECTION INFO
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "inject-prep",
    category: "injection",
    title: { en: "Preparing for Your Eye Injection", es: "Preparación para su Inyección Ocular", vi: "Chuẩn Bị Cho Tiêm Mắt", pt: "Preparação para Injeção Ocular" },
    tags: ["injection", "prep"],
    content: {
      en: `PREPARING FOR YOUR EYE INJECTION

What to Expect
Your doctor has recommended an intravitreal injection — a quick, in-office procedure where medication is placed directly inside your eye. The injection itself takes only a few seconds.

Before Your Appointment
• Continue all regular medications unless your doctor says otherwise.
• You may eat and drink normally before your appointment.
• Arrange a ride if you feel more comfortable, though most patients drive themselves.
• You do NOT need to stop blood thinners (aspirin, warfarin, Eliquis, etc.) for eye injections.

What Happens During the Injection
1. Numbing drops and/or gel are applied — you should feel little to no pain.
2. Your eye and eyelids are cleaned with an antiseptic (betadine).
3. A small speculum gently holds your eyelids open.
4. The injection is given through the white part of the eye (sclera).
5. The entire process takes about 5–10 minutes.

Common Sensations
• Mild pressure or a brief pinch during the injection.
• Temporary blurry vision for several hours.
• A small red spot on the white of your eye (subconjunctival hemorrhage) — this is harmless and resolves on its own.
• Floaters or tiny bubbles in your vision — these usually clear within a day or two.

Call Your Doctor If You Experience
• Increasing pain after the first day.
• Significant vision loss.
• Increasing redness that worsens after 2 days.
• Discharge or pus from the eye.
• Flashing lights or a curtain/shadow over your vision.`,

      es: `PREPARACIÓN PARA SU INYECCIÓN OCULAR

Qué Esperar
Su médico ha recomendado una inyección intravítrea — un procedimiento rápido en el consultorio donde se coloca medicamento directamente dentro de su ojo. La inyección en sí toma solo unos segundos.

Antes de su Cita
• Continúe todos sus medicamentos regulares a menos que su médico indique lo contrario.
• Puede comer y beber normalmente antes de su cita.
• Puede traer un acompañante si se siente más cómodo, aunque la mayoría de los pacientes conducen solos.
• NO necesita suspender los anticoagulantes (aspirina, warfarina, Eliquis, etc.) para las inyecciones oculares.

Qué Sucede Durante la Inyección
1. Se aplican gotas y/o gel anestésico — debe sentir poco o ningún dolor.
2. Su ojo y párpados se limpian con un antiséptico (betadine).
3. Un pequeño espéculo mantiene sus párpados abiertos suavemente.
4. La inyección se aplica a través de la parte blanca del ojo (esclera).
5. Todo el proceso toma aproximadamente 5–10 minutos.

Sensaciones Comunes
• Presión leve o un breve pinchazo durante la inyección.
• Visión borrosa temporal durante varias horas.
• Una pequeña mancha roja en la parte blanca de su ojo (hemorragia subconjuntival) — es inofensiva y se resuelve sola.
• Moscas volantes o pequeñas burbujas en su visión — generalmente desaparecen en uno o dos días.

Llame a su Médico Si Experimenta
• Dolor creciente después del primer día.
• Pérdida significativa de visión.
• Enrojecimiento creciente que empeora después de 2 días.
• Secreción o pus del ojo.
• Destellos de luz o una cortina/sombra en su visión.`,

      vi: `CHUẨN BỊ CHO TIÊM MẮT

Điều Gì Sẽ Xảy Ra
Bác sĩ đã khuyến nghị tiêm nội nhãn — một thủ thuật nhanh tại phòng khám, trong đó thuốc được đưa trực tiếp vào bên trong mắt bạn. Mũi tiêm chỉ mất vài giây.

Trước Cuộc Hẹn
• Tiếp tục dùng tất cả thuốc thường ngày trừ khi bác sĩ nói khác.
• Bạn có thể ăn uống bình thường trước cuộc hẹn.
• Bạn có thể nhờ người đưa đón nếu cảm thấy thoải mái hơn, dù hầu hết bệnh nhân tự lái xe.
• Bạn KHÔNG cần ngừng thuốc chống đông máu (aspirin, warfarin, Eliquis, v.v.) cho tiêm mắt.

Điều Gì Xảy Ra Trong Khi Tiêm
1. Thuốc nhỏ mắt và/hoặc gel gây tê được bôi — bạn sẽ cảm thấy ít hoặc không đau.
2. Mắt và mí mắt được làm sạch bằng chất sát trùng (betadine).
3. Một dụng cụ nhỏ giữ mí mắt mở nhẹ nhàng.
4. Mũi tiêm được thực hiện qua phần trắng của mắt (củng mạc).
5. Toàn bộ quá trình mất khoảng 5–10 phút.

Cảm Giác Thường Gặp
• Áp lực nhẹ hoặc cảm giác châm chích ngắn khi tiêm.
• Mờ mắt tạm thời trong vài giờ.
• Một đốm đỏ nhỏ trên phần trắng mắt (xuất huyết dưới kết mạc) — vô hại và tự hết.
• Đốm đen hoặc bong bóng nhỏ trong tầm nhìn — thường hết trong một hoặc hai ngày.

Gọi Bác Sĩ Nếu Bạn Gặp
• Đau tăng sau ngày đầu tiên.
• Giảm thị lực đáng kể.
• Đỏ mắt tăng sau 2 ngày.
• Dịch tiết hoặc mủ từ mắt.
• Ánh sáng lóe hoặc bóng/màn che trong tầm nhìn.`,

      pt: `PREPARAÇÃO PARA INJEÇÃO OCULAR

O Que Esperar
Seu médico recomendou uma injeção intravítrea — um procedimento rápido no consultório onde o medicamento é colocado diretamente dentro do seu olho. A injeção em si leva apenas alguns segundos.

Antes da Consulta
• Continue todos os medicamentos regulares, a menos que seu médico diga o contrário.
• Você pode comer e beber normalmente antes da consulta.
• Providencie uma carona se se sentir mais confortável, embora a maioria dos pacientes dirija sozinho.
• Você NÃO precisa parar anticoagulantes (aspirina, varfarina, Eliquis, etc.) para injeções oculares.

O Que Acontece Durante a Injeção
1. Colírio e/ou gel anestésico são aplicados — você deve sentir pouca ou nenhuma dor.
2. Seu olho e pálpebras são limpos com antisséptico (betadine).
3. Um pequeno espéculo mantém suas pálpebras abertas gentilmente.
4. A injeção é aplicada através da parte branca do olho (esclera).
5. Todo o processo leva cerca de 5–10 minutos.

Sensações Comuns
• Leve pressão ou uma breve picada durante a injeção.
• Visão embaçada temporária por várias horas.
• Uma pequena mancha vermelha na parte branca do olho (hemorragia subconjuntival) — é inofensiva e se resolve sozinha.
• Moscas volantes ou pequenas bolhas na visão — geralmente desaparecem em um ou dois dias.

Ligue para seu Médico Se Tiver
• Dor crescente após o primeiro dia.
• Perda significativa de visão.
• Vermelhidão crescente que piora após 2 dias.
• Secreção ou pus do olho.
• Flashes de luz ou cortina/sombra na visão.`
    }
  },
  {
    id: "inject-post",
    category: "injection",
    title: { en: "After Your Eye Injection — Post-Injection Care", es: "Después de su Inyección — Cuidados Post-Inyección", vi: "Sau Tiêm Mắt — Chăm Sóc Sau Tiêm", pt: "Após a Injeção — Cuidados Pós-Injeção" },
    tags: ["injection", "post-op", "care"],
    content: {
      en: `AFTER YOUR EYE INJECTION — POST-INJECTION CARE

Immediately After
• You may resume normal activities right away, including reading, watching TV, and using your phone.
• Mild discomfort, scratchiness, or tearing is normal for 1–2 days.
• You can use artificial tears (preservative-free) for comfort.

The First 48 Hours
• Avoid rubbing your eye.
• Avoid swimming, hot tubs, or submerging your face in water for 48 hours.
• You may shower and wash your face gently — just avoid direct water pressure to the eye.
• It is okay to sleep on either side.

Your Medications
• Continue all your regular eye drops and medications unless told otherwise.
• If you were given antibiotic drops, use them as directed (typically 4 times a day for 3–4 days).

What's Normal
• A small red spot (blood) on the white of your eye — harmless and clears in 1–2 weeks.
• Floaters or tiny bubbles — usually resolve within a day or two.
• Mild scratchy sensation — improves within 24 hours.

Warning Signs — Call Us Immediately If You Have
• PAIN that is severe or worsening after the first day.
• VISION LOSS — significant decrease from your baseline.
• INCREASING REDNESS after the first 2 days.
• DISCHARGE — any yellow or green pus.
• FLASHES or a CURTAIN/SHADOW in your vision.

Contact Information
If you have concerns, call your retina doctor's office. After hours, the answering service can reach the on-call physician.`,

      es: `DESPUÉS DE SU INYECCIÓN OCULAR — CUIDADOS POST-INYECCIÓN

Inmediatamente Después
• Puede reanudar sus actividades normales de inmediato, incluyendo leer, ver televisión y usar su teléfono.
• Molestia leve, sensación de rasquiña o lagrimeo es normal por 1–2 días.
• Puede usar lágrimas artificiales (sin conservantes) para mayor comodidad.

Las Primeras 48 Horas
• Evite frotarse el ojo.
• Evite nadar, jacuzzis o sumergir su cara en agua durante 48 horas.
• Puede ducharse y lavarse la cara suavemente — solo evite presión directa de agua en el ojo.
• Está bien dormir de cualquier lado.

Sus Medicamentos
• Continúe todas sus gotas y medicamentos regulares a menos que se indique lo contrario.
• Si le dieron gotas antibióticas, úselas según las indicaciones (típicamente 4 veces al día durante 3–4 días).

Qué es Normal
• Una pequeña mancha roja (sangre) en la parte blanca del ojo — inofensiva y desaparece en 1–2 semanas.
• Moscas volantes o pequeñas burbujas — generalmente se resuelven en uno o dos días.
• Sensación leve de rasquiña — mejora en 24 horas.

Señales de Alarma — Llámenos Inmediatamente Si Tiene
• DOLOR severo o que empeora después del primer día.
• PÉRDIDA DE VISIÓN — disminución significativa de su nivel basal.
• ENROJECIMIENTO CRECIENTE después de los primeros 2 días.
• SECRECIÓN — cualquier pus amarillo o verde.
• DESTELLOS o una CORTINA/SOMBRA en su visión.

Información de Contacto
Si tiene preocupaciones, llame al consultorio de su médico retinólogo. Fuera de horario, el servicio de contestador puede contactar al médico de guardia.`,

      vi: `SAU TIÊM MẮT — CHĂM SÓC SAU TIÊM

Ngay Sau Tiêm
• Bạn có thể tiếp tục hoạt động bình thường ngay lập tức, bao gồm đọc sách, xem TV và sử dụng điện thoại.
• Khó chịu nhẹ, cảm giác cộm hoặc chảy nước mắt là bình thường trong 1–2 ngày.
• Bạn có thể dùng nước mắt nhân tạo (không chất bảo quản) cho thoải mái.

48 Giờ Đầu Tiên
• Tránh dụi mắt.
• Tránh bơi, ngâm bồn nước nóng hoặc ngâm mặt trong nước trong 48 giờ.
• Bạn có thể tắm và rửa mặt nhẹ nhàng — chỉ tránh áp lực nước trực tiếp vào mắt.
• Có thể ngủ nghiêng bên nào cũng được.

Thuốc Của Bạn
• Tiếp tục tất cả thuốc nhỏ mắt và thuốc thường ngày trừ khi được chỉ dẫn khác.
• Nếu được cho thuốc nhỏ kháng sinh, dùng theo chỉ dẫn (thường 4 lần/ngày trong 3–4 ngày).

Điều Bình Thường
• Đốm đỏ nhỏ (máu) trên phần trắng mắt — vô hại và hết trong 1–2 tuần.
• Đốm đen hoặc bong bóng nhỏ — thường hết trong một hoặc hai ngày.
• Cảm giác cộm nhẹ — cải thiện trong 24 giờ.

Dấu Hiệu Cảnh Báo — Gọi Ngay Nếu Bạn Có
• ĐAU nặng hoặc tăng sau ngày đầu tiên.
• MẤT THỊ LỰC — giảm đáng kể so với mức bình thường.
• ĐỎ MẮT TĂNG sau 2 ngày đầu.
• DỊCH TIẾT — bất kỳ mủ vàng hoặc xanh nào.
• ÁNH SÁNG LÓE hoặc MÀN CHE/BÓNG trong tầm nhìn.

Thông Tin Liên Hệ
Nếu bạn có lo ngại, gọi phòng khám bác sĩ võng mạc. Ngoài giờ làm việc, dịch vụ trực tổng đài có thể liên lạc bác sĩ trực.`,

      pt: `APÓS A INJEÇÃO OCULAR — CUIDADOS PÓS-INJEÇÃO

Imediatamente Após
• Você pode retomar atividades normais imediatamente, incluindo ler, assistir TV e usar o celular.
• Desconforto leve, sensação de arranhão ou lacrimejamento é normal por 1–2 dias.
• Você pode usar lágrimas artificiais (sem conservantes) para conforto.

As Primeiras 48 Horas
• Evite esfregar o olho.
• Evite nadar, banheiras de hidromassagem ou submergir o rosto na água por 48 horas.
• Você pode tomar banho e lavar o rosto suavemente — apenas evite pressão direta de água no olho.
• Pode dormir de qualquer lado.

Seus Medicamentos
• Continue todos os colírios e medicamentos regulares, a menos que orientado de outra forma.
• Se recebeu colírio antibiótico, use conforme orientado (tipicamente 4 vezes ao dia por 3–4 dias).

O Que é Normal
• Uma pequena mancha vermelha (sangue) na parte branca do olho — inofensiva e desaparece em 1–2 semanas.
• Moscas volantes ou pequenas bolhas — geralmente desaparecem em um ou dois dias.
• Sensação leve de arranhão — melhora em 24 horas.

Sinais de Alerta — Ligue Imediatamente Se Tiver
• DOR severa ou que piora após o primeiro dia.
• PERDA DE VISÃO — diminuição significativa do seu nível basal.
• VERMELHIDÃO CRESCENTE após os primeiros 2 dias.
• SECREÇÃO — qualquer pus amarelo ou verde.
• FLASHES ou CORTINA/SOMBRA na visão.

Informações de Contato
Se tiver preocupações, ligue para o consultório do seu retinólogo. Fora do horário, o serviço de atendimento pode contatar o médico de plantão.`
    }
  },
  {
    id: "inject-faq",
    category: "injection",
    title: { en: "Eye Injection FAQ", es: "Preguntas Frecuentes sobre Inyecciones", vi: "Câu Hỏi Thường Gặp Về Tiêm Mắt", pt: "Perguntas Frequentes sobre Injeções" },
    tags: ["injection", "FAQ"],
    content: {
      en: `EYE INJECTION FAQ — COMMON QUESTIONS

Q: Will the injection hurt?
A: Most patients feel only brief pressure or a mild pinch. Numbing drops are always used, and many patients say it is much less uncomfortable than they expected.

Q: How often will I need injections?
A: This depends on your condition and how you respond to treatment. Some patients start with monthly injections; over time, your doctor may be able to extend the interval. Newer medications (like Vabysmo) may allow injections every 2–4 months.

Q: Can I drive myself home?
A: Most patients can drive after their injection. Your vision may be a little blurry for a few hours, so arrange a ride if that concerns you.

Q: Do I need to stop my blood thinners?
A: No. Do NOT stop aspirin, warfarin (Coumadin), Eliquis, Xarelto, or any blood thinner for eye injections. The risk of stopping these medications is greater than the small risk of a bleed in the eye.

Q: Why do I see floaters or bubbles after the injection?
A: The medication or a small air bubble can cause temporary floaters. These typically resolve within a day or two.

Q: What medications are used for injections?
A: Common retina injection medications include Eylea (aflibercept), Avastin (bevacizumab), Lucentis (ranibizumab), and Vabysmo (faricimab). Your doctor will choose the best one for your condition and insurance coverage.

Q: Is there anything I should avoid after the injection?
A: Avoid rubbing the eye, swimming, or submerging your face in water for 48 hours. Otherwise, you can resume all normal activities.

Q: What are the risks of eye injections?
A: Serious complications are rare. The most serious risk is infection inside the eye (endophthalmitis), which occurs in less than 1 in 2,000 injections. This is why the eye is carefully cleaned with betadine before every injection. Other rare risks include retinal detachment, bleeding, and increased eye pressure.`,

      es: `PREGUNTAS FRECUENTES SOBRE INYECCIONES OCULARES

P: ¿Dolerá la inyección?
R: La mayoría de los pacientes sienten solo una breve presión o un pinchazo leve. Siempre se usan gotas anestésicas, y muchos pacientes dicen que es mucho menos incómodo de lo que esperaban.

P: ¿Con qué frecuencia necesitaré inyecciones?
R: Esto depende de su condición y cómo responda al tratamiento. Algunos pacientes comienzan con inyecciones mensuales; con el tiempo, su médico puede extender el intervalo. Medicamentos más nuevos (como Vabysmo) pueden permitir inyecciones cada 2–4 meses.

P: ¿Puedo conducir a casa?
R: La mayoría de los pacientes pueden conducir después de su inyección. Su visión puede estar un poco borrosa durante unas horas, así que organice transporte si eso le preocupa.

P: ¿Necesito suspender mis anticoagulantes?
R: No. NO suspenda aspirina, warfarina (Coumadin), Eliquis, Xarelto ni ningún anticoagulante para inyecciones oculares. El riesgo de suspender estos medicamentos es mayor que el pequeño riesgo de sangrado en el ojo.

P: ¿Por qué veo moscas volantes o burbujas después de la inyección?
R: El medicamento o una pequeña burbuja de aire pueden causar moscas volantes temporales. Generalmente se resuelven en uno o dos días.

P: ¿Qué medicamentos se usan para las inyecciones?
R: Los medicamentos comunes incluyen Eylea (aflibercept), Avastin (bevacizumab), Lucentis (ranibizumab) y Vabysmo (faricimab). Su médico elegirá el mejor para su condición y cobertura de seguro.

P: ¿Hay algo que deba evitar después de la inyección?
R: Evite frotarse el ojo, nadar o sumergir su cara en agua durante 48 horas. De lo contrario, puede reanudar todas sus actividades normales.

P: ¿Cuáles son los riesgos de las inyecciones oculares?
R: Las complicaciones graves son raras. El riesgo más serio es una infección dentro del ojo (endoftalmitis), que ocurre en menos de 1 de cada 2,000 inyecciones. Por eso el ojo se limpia cuidadosamente con betadine antes de cada inyección. Otros riesgos raros incluyen desprendimiento de retina, sangrado y aumento de presión ocular.`,

      vi: `CÂU HỎI THƯỜNG GẶP VỀ TIÊM MẮT

H: Tiêm có đau không?
Đ: Hầu hết bệnh nhân chỉ cảm thấy áp lực ngắn hoặc châm chích nhẹ. Thuốc tê luôn được sử dụng, và nhiều bệnh nhân nói rằng ít khó chịu hơn nhiều so với họ nghĩ.

H: Tôi cần tiêm bao lâu một lần?
Đ: Điều này phụ thuộc vào tình trạng bệnh và cách bạn đáp ứng điều trị. Một số bệnh nhân bắt đầu tiêm hàng tháng; theo thời gian, bác sĩ có thể kéo dài khoảng cách. Thuốc mới hơn (như Vabysmo) có thể cho phép tiêm mỗi 2–4 tháng.

H: Tôi có thể tự lái xe về nhà không?
Đ: Hầu hết bệnh nhân có thể lái xe sau tiêm. Tầm nhìn có thể hơi mờ vài giờ, nên hãy sắp xếp người đưa nếu bạn lo lắng.

H: Tôi có cần ngừng thuốc chống đông không?
Đ: Không. KHÔNG ngừng aspirin, warfarin (Coumadin), Eliquis, Xarelto hay bất kỳ thuốc chống đông nào cho tiêm mắt. Nguy cơ ngừng thuốc lớn hơn nguy cơ nhỏ của chảy máu trong mắt.

H: Tại sao tôi thấy đốm đen hoặc bong bóng sau tiêm?
Đ: Thuốc hoặc bong bóng khí nhỏ có thể gây đốm đen tạm thời. Chúng thường hết trong một hoặc hai ngày.

H: Thuốc nào được dùng cho tiêm?
Đ: Thuốc tiêm võng mạc thường gặp bao gồm Eylea (aflibercept), Avastin (bevacizumab), Lucentis (ranibizumab), và Vabysmo (faricimab). Bác sĩ sẽ chọn thuốc tốt nhất cho tình trạng và bảo hiểm của bạn.

H: Có điều gì tôi nên tránh sau tiêm?
Đ: Tránh dụi mắt, bơi, hoặc ngâm mặt trong nước 48 giờ. Ngoài ra, bạn có thể tiếp tục mọi hoạt động bình thường.

H: Rủi ro của tiêm mắt là gì?
Đ: Biến chứng nghiêm trọng rất hiếm. Rủi ro nghiêm trọng nhất là nhiễm trùng bên trong mắt (viêm nội nhãn), xảy ra ít hơn 1 trên 2.000 lần tiêm. Đó là lý do mắt được làm sạch cẩn thận bằng betadine trước mỗi lần tiêm.`,

      pt: `PERGUNTAS FREQUENTES SOBRE INJEÇÕES OCULARES

P: A injeção vai doer?
R: A maioria dos pacientes sente apenas uma breve pressão ou uma leve picada. Colírio anestésico é sempre usado, e muitos pacientes dizem que é muito menos desconfortável do que esperavam.

P: Com que frequência precisarei de injeções?
R: Depende da sua condição e como você responde ao tratamento. Alguns pacientes começam com injeções mensais; com o tempo, seu médico pode estender o intervalo. Medicamentos mais novos (como Vabysmo) podem permitir injeções a cada 2–4 meses.

P: Posso dirigir para casa?
R: A maioria dos pacientes pode dirigir após a injeção. Sua visão pode ficar um pouco embaçada por algumas horas, então providencie uma carona se isso lhe preocupar.

P: Preciso parar meus anticoagulantes?
R: Não. NÃO pare aspirina, varfarina (Coumadin), Eliquis, Xarelto ou qualquer anticoagulante para injeções oculares. O risco de parar esses medicamentos é maior que o pequeno risco de sangramento no olho.

P: Por que vejo moscas volantes ou bolhas após a injeção?
R: O medicamento ou uma pequena bolha de ar podem causar moscas volantes temporárias. Geralmente desaparecem em um ou dois dias.

P: Quais medicamentos são usados para injeções?
R: Medicamentos comuns incluem Eylea (aflibercepte), Avastin (bevacizumabe), Lucentis (ranibizumabe) e Vabysmo (faricimabe). Seu médico escolherá o melhor para sua condição e cobertura do plano.

P: Há algo que devo evitar após a injeção?
R: Evite esfregar o olho, nadar ou submergir o rosto na água por 48 horas. Caso contrário, pode retomar todas as atividades normais.

P: Quais são os riscos das injeções oculares?
R: Complicações graves são raras. O risco mais sério é infecção dentro do olho (endoftalmite), que ocorre em menos de 1 em 2.000 injeções. Por isso o olho é cuidadosamente limpo com betadine antes de cada injeção.`
    }
  },
  {
    id: "inject-drops",
    category: "injection",
    title: { en: "Eye Drop & Medication Schedule", es: "Horario de Gotas y Medicamentos", vi: "Lịch Nhỏ Thuốc Mắt", pt: "Cronograma de Colírios e Medicamentos" },
    tags: ["drops", "medication", "schedule", "post-op"],
    content: {
      en: `EYE DROP & MEDICATION SCHEDULE

Why Eye Drops Matter
After eye procedures or injections, your doctor may prescribe eye drops to prevent infection and reduce inflammation. Using them correctly and on schedule is important for your healing.

General Tips for Using Eye Drops
• Wash your hands before putting in drops.
• Tilt your head back and pull down your lower eyelid to create a small pocket.
• Hold the bottle close to your eye (but don't touch your eye with the tip).
• Squeeze one drop into the pocket. Close your eye gently — don't blink hard.
• If using more than one drop at the same time, wait at least 5 minutes between different drops.
• If you also use artificial tears, put them in LAST (at least 5 minutes after your medicated drops).
• Keep drops at room temperature unless your doctor says otherwise.

Common Post-Procedure Drop Schedules

AFTER EYE INJECTION (if prescribed):
• Antibiotic drop (e.g., ofloxacin, moxifloxacin): 4 times a day for 3 days, starting the day of the injection.

AFTER CATARACT SURGERY (typical):
Week 1–2:
• Antibiotic drop: 4 times a day
• Steroid drop (e.g., prednisolone): 4 times a day
• NSAID drop (e.g., ketorolac, bromfenac): 2–4 times a day

Week 3–4:
• Taper steroid to 3 times a day, then 2 times a day (as directed)
• Continue NSAID as directed
• Stop antibiotic after 1–2 weeks (as directed)

AFTER VITRECTOMY (typical):
• Antibiotic drop: 4 times a day for 1–2 weeks
• Steroid drop: 4 times a day, then taper over 4–6 weeks
• Dilating drop (e.g., atropine): as directed by your surgeon

NOTE: Your specific schedule may differ. Always follow YOUR doctor's instructions.

Helpful Reminders
• Set phone alarms for each drop time.
• Keep a simple checklist on your refrigerator.
• Bring all your eye drops to every appointment.
• If you run out of drops before your next visit, call for a refill.
• If you miss a dose, put the drop in as soon as you remember, then resume your regular schedule.`,

      es: `HORARIO DE GOTAS Y MEDICAMENTOS OCULARES

Por Qué Son Importantes las Gotas
Después de procedimientos o inyecciones oculares, su médico puede recetar gotas para prevenir infecciones y reducir la inflamación. Usarlas correctamente y a tiempo es importante para su recuperación.

Consejos Generales para Usar Gotas
• Lávese las manos antes de ponerse las gotas.
• Incline la cabeza hacia atrás y tire del párpado inferior para crear un pequeño bolsillo.
• Sostenga el frasco cerca del ojo (pero no toque el ojo con la punta).
• Ponga una gota en el bolsillo. Cierre el ojo suavemente — no parpadee fuerte.
• Si usa más de una gota a la vez, espere al menos 5 minutos entre gotas diferentes.
• Si también usa lágrimas artificiales, póngalas DE ÚLTIMO (al menos 5 minutos después de las gotas medicadas).
• Mantenga las gotas a temperatura ambiente a menos que su médico indique lo contrario.

Horarios Comunes de Gotas Post-Procedimiento

DESPUÉS DE INYECCIÓN OCULAR (si se recetaron):
• Gota antibiótica (ej., ofloxacina, moxifloxacina): 4 veces al día por 3 días.

DESPUÉS DE CIRUGÍA DE CATARATA (típico):
Semana 1–2:
• Gota antibiótica: 4 veces al día
• Gota esteroide (ej., prednisolona): 4 veces al día
• Gota AINE (ej., ketorolaco, bromfenac): 2–4 veces al día

Semana 3–4:
• Reducir esteroide a 3 veces al día, luego 2 veces (según indicaciones)
• Continuar AINE según indicaciones
• Suspender antibiótico después de 1–2 semanas

DESPUÉS DE VITRECTOMÍA (típico):
• Gota antibiótica: 4 veces al día por 1–2 semanas
• Gota esteroide: 4 veces al día, luego reducir durante 4–6 semanas
• Gota dilatadora (ej., atropina): según indicaciones

NOTA: Su horario específico puede diferir. Siempre siga las instrucciones de SU médico.

Recordatorios Útiles
• Ponga alarmas en el teléfono para cada horario de gotas.
• Mantenga una lista simple en su refrigerador.
• Traiga todas sus gotas a cada cita.
• Si se le acaban las gotas antes de su próxima visita, llame para un resurtido.`,

      vi: `LỊCH NHỎ THUỐC MẮT VÀ THUỐC

Tại Sao Thuốc Nhỏ Mắt Quan Trọng
Sau thủ thuật hoặc tiêm mắt, bác sĩ có thể kê thuốc nhỏ để ngăn nhiễm trùng và giảm viêm. Sử dụng đúng cách và đúng giờ rất quan trọng cho quá trình hồi phục.

Mẹo Chung Khi Nhỏ Thuốc
• Rửa tay trước khi nhỏ thuốc.
• Ngả đầu ra sau và kéo mí dưới xuống để tạo túi nhỏ.
• Giữ chai gần mắt (nhưng không chạm đầu chai vào mắt).
• Nhỏ một giọt vào túi. Nhắm mắt nhẹ nhàng — không chớp mạnh.
• Nếu dùng nhiều loại thuốc cùng lúc, đợi ít nhất 5 phút giữa các loại khác nhau.
• Nếu cũng dùng nước mắt nhân tạo, nhỏ SAU CÙNG (ít nhất 5 phút sau thuốc).
• Bảo quản thuốc ở nhiệt độ phòng trừ khi bác sĩ nói khác.

Lịch Nhỏ Thuốc Thường Gặp Sau Thủ Thuật

SAU TIÊM MẮT (nếu được kê):
• Thuốc kháng sinh (vd: ofloxacin, moxifloxacin): 4 lần/ngày trong 3 ngày.

SAU MỔ ĐỤC THỦY TINH THỂ (điển hình):
Tuần 1–2:
• Thuốc kháng sinh: 4 lần/ngày
• Thuốc steroid (vd: prednisolone): 4 lần/ngày
• Thuốc kháng viêm NSAID (vd: ketorolac, bromfenac): 2–4 lần/ngày

Tuần 3–4:
• Giảm steroid còn 3 lần/ngày, rồi 2 lần (theo chỉ dẫn)
• Tiếp tục NSAID theo chỉ dẫn
• Ngừng kháng sinh sau 1–2 tuần

SAU MỔ CẮT DỊCH KÍNH (điển hình):
• Thuốc kháng sinh: 4 lần/ngày trong 1–2 tuần
• Thuốc steroid: 4 lần/ngày, rồi giảm dần trong 4–6 tuần
• Thuốc giãn đồng tử (vd: atropine): theo chỉ dẫn

LƯU Ý: Lịch cụ thể của bạn có thể khác. Luôn tuân theo hướng dẫn của BÁC SĨ bạn.

Gợi Ý Hữu Ích
• Đặt báo thức điện thoại cho mỗi lần nhỏ thuốc.
• Dán danh sách đơn giản trên tủ lạnh.
• Mang tất cả thuốc nhỏ mắt đến mỗi cuộc hẹn.
• Nếu hết thuốc trước lần khám tiếp, gọi xin kê lại đơn.`,

      pt: `CRONOGRAMA DE COLÍRIOS E MEDICAMENTOS

Por Que os Colírios São Importantes
Após procedimentos ou injeções oculares, seu médico pode prescrever colírios para prevenir infecção e reduzir inflamação. Usá-los corretamente e no horário é importante para sua recuperação.

Dicas Gerais para Usar Colírios
• Lave as mãos antes de pingar os colírios.
• Incline a cabeça para trás e puxe a pálpebra inferior para criar um pequeno bolso.
• Segure o frasco perto do olho (mas não toque o olho com a ponta).
• Pingue uma gota no bolso. Feche o olho suavemente — não pisque forte.
• Se usar mais de um colírio ao mesmo tempo, espere pelo menos 5 minutos entre diferentes colírios.
• Se também usar lágrimas artificiais, use POR ÚLTIMO (pelo menos 5 minutos após os colírios medicados).
• Mantenha os colírios em temperatura ambiente, a menos que seu médico diga o contrário.

Cronogramas Comuns Pós-Procedimento

APÓS INJEÇÃO OCULAR (se prescrito):
• Colírio antibiótico (ex: ofloxacino, moxifloxacino): 4 vezes ao dia por 3 dias.

APÓS CIRURGIA DE CATARATA (típico):
Semana 1–2:
• Colírio antibiótico: 4 vezes ao dia
• Colírio esteroide (ex: prednisolona): 4 vezes ao dia
• Colírio AINE (ex: cetorolaco, bromfenaco): 2–4 vezes ao dia

Semana 3–4:
• Reduzir esteroide para 3 vezes ao dia, depois 2 vezes (conforme orientação)
• Continuar AINE conforme orientação
• Parar antibiótico após 1–2 semanas

APÓS VITRECTOMIA (típico):
• Colírio antibiótico: 4 vezes ao dia por 1–2 semanas
• Colírio esteroide: 4 vezes ao dia, depois reduzir ao longo de 4–6 semanas
• Colírio dilatador (ex: atropina): conforme orientação

NOTA: Seu cronograma específico pode diferir. Sempre siga as instruções do SEU médico.

Lembretes Úteis
• Configure alarmes no celular para cada horário de colírio.
• Mantenha uma lista simples na geladeira.
• Traga todos os colírios a cada consulta.
• Se acabar o colírio antes da próxima visita, ligue para renovar a receita.`
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // PROCEDURES
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "proc-prp",
    category: "procedure",
    title: { en: "Panretinal Photocoagulation (PRP) Laser", es: "Fotocoagulación Panretiniana (PRP)", vi: "Laser Quang Đông Toàn Võng Mạc (PRP)", pt: "Fotocoagulação Panretiniana (PRP)" },
    tags: ["laser", "PRP", "diabetic"],
    content: {
      en: `PANRETINAL PHOTOCOAGULATION (PRP) LASER

What Is PRP Laser?
PRP is a laser treatment used to treat proliferative diabetic retinopathy — a condition where abnormal new blood vessels grow on the retina. These fragile vessels can bleed and cause severe vision loss. PRP laser helps these abnormal vessels shrink and prevents new ones from forming.

Before the Procedure
• Your pupils will be dilated with eye drops (allow 20–30 minutes).
• Numbing drops or a local anesthetic may be applied.
• The procedure is performed in the office.

During the Procedure
• You sit at a special laser machine (similar to the slit lamp).
• A contact lens is placed on your eye to focus the laser.
• You will see bright flashes of light and may feel mild discomfort or a dull ache.
• Treatment takes 10–20 minutes per session. Sometimes PRP is done in 2–3 sessions.

After the Procedure
• Your vision will be blurry for several hours (from dilation and the laser).
• You may have a mild headache or aching around the eye — over-the-counter pain relievers can help.
• Night vision and peripheral (side) vision may be somewhat reduced — this is an expected trade-off to protect your central vision.
• Arrange a ride home, as your pupils will be dilated.

What to Watch For
• Significant vision loss.
• New floaters or flashing lights.
• Pain that does not improve with over-the-counter medication.

Follow-Up
• Your doctor will schedule a follow-up in 4–6 weeks.
• Additional laser sessions may be needed.`,

      es: `FOTOCOAGULACIÓN PANRETINIANA (PRP)

¿Qué Es el Láser PRP?
PRP es un tratamiento láser para la retinopatía diabética proliferativa — una condición donde crecen vasos sanguíneos anormales en la retina. Estos vasos frágiles pueden sangrar y causar pérdida severa de visión. El láser PRP ayuda a que estos vasos se reduzcan y previene la formación de nuevos.

Antes del Procedimiento
• Sus pupilas serán dilatadas con gotas (espere 20–30 minutos).
• Se pueden aplicar gotas anestésicas o anestesia local.
• El procedimiento se realiza en el consultorio.

Durante el Procedimiento
• Se sienta frente a una máquina láser especial (similar a la lámpara de hendidura).
• Se coloca un lente de contacto en su ojo para enfocar el láser.
• Verá destellos brillantes y puede sentir molestia leve o dolor sordo.
• El tratamiento toma 10–20 minutos por sesión. A veces el PRP se hace en 2–3 sesiones.

Después del Procedimiento
• Su visión estará borrosa por varias horas.
• Puede tener dolor de cabeza leve — analgésicos de venta libre pueden ayudar.
• La visión nocturna y periférica puede reducirse algo — esto es esperado para proteger su visión central.
• Organice transporte a casa.

Cuándo Llamar
• Pérdida significativa de visión.
• Nuevas moscas volantes o destellos.
• Dolor que no mejora con medicamentos de venta libre.`,

      vi: `LASER QUANG ĐÔNG TOÀN VÕNG MẠC (PRP)

PRP Laser Là Gì?
PRP là phương pháp laser điều trị bệnh võng mạc đái tháo đường tăng sinh — tình trạng mạch máu bất thường mọc trên võng mạc. Các mạch máu mỏng manh này có thể chảy máu và gây mất thị lực nghiêm trọng. Laser PRP giúp các mạch máu bất thường co lại và ngăn hình thành mạch mới.

Trước Thủ Thuật
• Đồng tử sẽ được giãn bằng thuốc nhỏ (chờ 20–30 phút).
• Thuốc tê nhỏ hoặc gây tê tại chỗ có thể được sử dụng.
• Thủ thuật được thực hiện tại phòng khám.

Trong Khi Thủ Thuật
• Bạn ngồi trước máy laser đặc biệt (tương tự đèn khe).
• Kính tiếp xúc được đặt trên mắt để tập trung laser.
• Bạn sẽ thấy ánh sáng chói và có thể cảm thấy khó chịu nhẹ hoặc đau âm ỉ.
• Điều trị mất 10–20 phút mỗi buổi. Đôi khi PRP được thực hiện trong 2–3 buổi.

Sau Thủ Thuật
• Tầm nhìn sẽ mờ vài giờ.
• Có thể đau đầu nhẹ — thuốc giảm đau không kê đơn có thể giúp.
• Thị lực ban đêm và ngoại vi có thể giảm — đây là sự đánh đổi để bảo vệ thị lực trung tâm.
• Sắp xếp người đưa về nhà.

Khi Nào Gọi
• Mất thị lực đáng kể.
• Đốm đen mới hoặc ánh sáng lóe.
• Đau không cải thiện với thuốc không kê đơn.`,

      pt: `FOTOCOAGULAÇÃO PANRETINIANA (PRP)

O Que É o Laser PRP?
PRP é um tratamento a laser para retinopatia diabética proliferativa — uma condição onde vasos sanguíneos anormais crescem na retina. Esses vasos frágeis podem sangrar e causar perda severa de visão. O laser PRP ajuda esses vasos a encolher e previne a formação de novos.

Antes do Procedimento
• Suas pupilas serão dilatadas com colírio (espere 20–30 minutos).
• Colírio anestésico ou anestesia local pode ser aplicado.
• O procedimento é realizado no consultório.

Durante o Procedimento
• Você senta em frente a uma máquina laser especial (similar à lâmpada de fenda).
• Uma lente de contato é colocada no olho para focar o laser.
• Você verá flashes brilhantes e pode sentir leve desconforto ou dor surda.
• O tratamento leva 10–20 minutos por sessão. Às vezes o PRP é feito em 2–3 sessões.

Após o Procedimento
• Sua visão ficará embaçada por várias horas.
• Pode ter dor de cabeça leve — analgésicos sem receita podem ajudar.
• Visão noturna e periférica podem diminuir — isso é esperado para proteger sua visão central.
• Providencie transporte para casa.

Quando Ligar
• Perda significativa de visão.
• Novas moscas volantes ou flashes.
• Dor que não melhora com medicamentos sem receita.`
    }
  },
  {
    id: "proc-laser-tear",
    category: "procedure",
    title: { en: "Laser Treatment for Retinal Tears", es: "Láser para Desgarros de Retina", vi: "Laser Điều Trị Rách Võng Mạc", pt: "Laser para Rasgos de Retina" },
    tags: ["laser", "retinal tear", "retinopexy", "prevention"],
    content: {
      en: `LASER TREATMENT FOR RETINAL TEARS

What Is Laser Retinopexy?
Laser retinopexy seals a retinal tear before it can progress to a retinal detachment. The laser creates small burns around the tear that form scar tissue, acting like a "spot weld" to hold the retina in place.

Why Is This Important?
A retinal tear left untreated can allow fluid to seep underneath the retina, causing a retinal detachment — a serious condition that requires surgery and can lead to permanent vision loss.

Before the Procedure
• Your pupils will be dilated.
• The procedure is performed in the office.
• No fasting or special preparation is needed.

During the Procedure
• You sit at a laser machine (similar to the slit lamp).
• A contact lens is placed on your eye.
• You will see bright flashes and may feel a mild ache or pinch.
• Treatment takes about 5–15 minutes.

After the Procedure
• Vision will be blurry for several hours from dilation.
• Mild discomfort or headache is normal and resolves quickly.
• You can resume normal activities immediately.
• The laser adhesion takes about 1–2 weeks to fully strengthen.

Precautions for the First 1–2 Weeks
• Avoid very heavy lifting or straining.
• Avoid high-impact activities (contact sports, roller coasters).
• Otherwise, normal activity is fine.

Warning Signs — Call Immediately If
• New flashes of light.
• A sudden increase in floaters.
• A shadow or curtain in your vision.

Follow-Up
• Your doctor will recheck your eye in 1–4 weeks to confirm the seal is holding.`,

      es: `LÁSER PARA DESGARROS DE RETINA

¿Qué Es la Retinopexia con Láser?
La retinopexia con láser sella un desgarro retiniano antes de que progrese a un desprendimiento de retina. El láser crea pequeñas quemaduras alrededor del desgarro que forman tejido cicatricial, actuando como un "punto de soldadura" para mantener la retina en su lugar.

¿Por Qué Es Importante?
Un desgarro retiniano sin tratar puede permitir que el líquido se filtre debajo de la retina, causando un desprendimiento — una condición seria que requiere cirugía y puede causar pérdida permanente de visión.

Antes del Procedimiento
• Sus pupilas serán dilatadas.
• El procedimiento se realiza en el consultorio.
• No se necesita ayuno ni preparación especial.

Durante el Procedimiento
• Se sienta frente a una máquina láser.
• Se coloca un lente de contacto en su ojo.
• Verá destellos brillantes y puede sentir un dolor leve.
• El tratamiento toma unos 5–15 minutos.

Después del Procedimiento
• La visión estará borrosa por varias horas por la dilatación.
• Molestia leve o dolor de cabeza es normal.
• Puede reanudar actividades normales inmediatamente.
• La adhesión del láser toma 1–2 semanas para fortalecerse completamente.

Precauciones por 1–2 Semanas
• Evite levantar objetos muy pesados.
• Evite actividades de alto impacto (deportes de contacto, montañas rusas).

Señales de Alarma — Llame Inmediatamente Si
• Nuevos destellos de luz.
• Aumento súbito de moscas volantes.
• Una sombra o cortina en su visión.`,

      vi: `LASER ĐIỀU TRỊ RÁCH VÕNG MẠC

Laser Retinopexy Là Gì?
Laser retinopexy bịt kín vết rách võng mạc trước khi nó tiến triển thành bong võng mạc. Laser tạo các vết đốt nhỏ xung quanh vết rách hình thành mô sẹo, giống như "hàn điểm" giữ võng mạc tại chỗ.

Tại Sao Điều Này Quan Trọng?
Vết rách võng mạc không điều trị có thể cho phép dịch thấm dưới võng mạc, gây bong võng mạc — tình trạng nghiêm trọng cần phẫu thuật và có thể gây mất thị lực vĩnh viễn.

Trước Thủ Thuật
• Đồng tử sẽ được giãn.
• Thủ thuật được thực hiện tại phòng khám.
• Không cần nhịn ăn hay chuẩn bị đặc biệt.

Trong Khi Thủ Thuật
• Bạn ngồi trước máy laser.
• Kính tiếp xúc được đặt trên mắt.
• Bạn sẽ thấy ánh sáng chói và có thể cảm thấy đau nhẹ.
• Điều trị mất khoảng 5–15 phút.

Sau Thủ Thuật
• Tầm nhìn mờ vài giờ do giãn đồng tử.
• Khó chịu nhẹ hoặc đau đầu là bình thường.
• Có thể tiếp tục hoạt động bình thường ngay.
• Vết dán laser mất 1–2 tuần để chắc hoàn toàn.

Lưu Ý Trong 1–2 Tuần Đầu
• Tránh nâng vật nặng hoặc gắng sức.
• Tránh hoạt động va chạm mạnh.

Dấu Hiệu Cảnh Báo — Gọi Ngay Nếu
• Ánh sáng lóe mới.
• Đốm đen tăng đột ngột.
• Bóng hoặc màn che trong tầm nhìn.`,

      pt: `LASER PARA RASGOS DE RETINA

O Que É Retinopexia a Laser?
A retinopexia a laser sela um rasgo retiniano antes que progrida para um descolamento de retina. O laser cria pequenas queimaduras ao redor do rasgo que formam tecido cicatricial, agindo como uma "solda pontual" para manter a retina no lugar.

Por Que É Importante?
Um rasgo retiniano não tratado pode permitir que líquido se infiltre sob a retina, causando um descolamento — condição séria que requer cirurgia e pode levar a perda permanente de visão.

Antes do Procedimento
• Suas pupilas serão dilatadas.
• O procedimento é realizado no consultório.
• Não é necessário jejum ou preparação especial.

Durante o Procedimento
• Você senta em frente à máquina laser.
• Uma lente de contato é colocada no olho.
• Verá flashes brilhantes e pode sentir leve dor.
• O tratamento leva cerca de 5–15 minutos.

Após o Procedimento
• Visão embaçada por várias horas devido à dilatação.
• Leve desconforto ou dor de cabeça é normal.
• Pode retomar atividades normais imediatamente.
• A adesão do laser leva 1–2 semanas para fortalecer completamente.

Precauções por 1–2 Semanas
• Evite levantar peso muito pesado.
• Evite atividades de alto impacto.

Sinais de Alerta — Ligue Imediatamente Se
• Novos flashes de luz.
• Aumento súbito de moscas volantes.
• Sombra ou cortina na visão.`
    }
  },
  {
    id: "proc-fa",
    category: "procedure",
    title: { en: "Fluorescein Angiography (FA)", es: "Angiografía con Fluoresceína (FA)", vi: "Chụp Mạch Huỳnh Quang (FA)", pt: "Angiografia Fluoresceínica (FA)" },
    tags: ["FA", "angiography", "fluorescein", "dye test", "imaging"],
    content: {
      en: `FLUORESCEIN ANGIOGRAPHY (FA)

What Is Fluorescein Angiography?
A diagnostic test that uses a special dye and camera to photograph the blood vessels in your retina. It helps identify leaking vessels, blocked vessels, and abnormal new vessel growth.

Why Is This Test Done?
To evaluate: diabetic retinopathy, wet AMD, retinal vein occlusion, macular edema, unexplained vision loss, tumors or inflammation.

Before the Test
• Your pupils will be dilated.
• Inform your doctor of any allergies, particularly to dyes.
• You may eat and drink normally.
• The test takes about 15–30 minutes.

During the Test
• A small needle is placed in your arm or hand.
• Fluorescein dye (bright yellow-orange) is injected into the vein.
• As the dye reaches your eyes (~10–15 seconds), a special camera takes rapid photographs.
• Photos are taken over about 5–10 minutes.

What to Expect After
• Your skin may appear slightly yellow/orange for several hours — normal.
• Your urine will be bright orange/yellow for 24–48 hours — this is the dye being filtered and is completely normal.
• Vision will be blurry from dilation for several hours.
• Mild nausea during injection is common and brief.

Risks
• Nausea: Brief queasiness in about 5% of patients.
• Allergic reaction: Mild reactions (hives, itching) are uncommon. Severe reactions are very rare (~1 in 200,000).
• Skin infiltration: If dye leaks at the IV site, temporary burning and yellow discoloration. Resolves on its own.

Important Notes
• Fluorescein is NOT the same as iodine-based contrast (CT scans). If you are allergic to CT contrast or shellfish, you can still have this test.
• This test does NOT use radiation.`,

      es: `ANGIOGRAFÍA CON FLUORESCEÍNA (FA)

¿Qué Es la Angiografía con Fluoresceína?
Una prueba diagnóstica que usa un colorante especial y cámara para fotografiar los vasos sanguíneos de su retina. Ayuda a identificar vasos con fugas, vasos bloqueados y crecimiento anormal de nuevos vasos.

¿Por Qué Se Hace Esta Prueba?
Para evaluar: retinopatía diabética, DMAE húmeda, oclusión venosa retiniana, edema macular, pérdida de visión inexplicada, tumores o inflamación.

Antes de la Prueba
• Sus pupilas serán dilatadas.
• Informe a su médico sobre cualquier alergia, particularmente a colorantes.
• Puede comer y beber normalmente.
• La prueba toma unos 15–30 minutos.

Durante la Prueba
• Se coloca una pequeña aguja en su brazo o mano.
• Se inyecta el colorante fluoresceína (amarillo-naranja brillante) en la vena.
• Cuando el colorante llega a sus ojos (~10–15 segundos), una cámara especial toma fotografías rápidas.

Qué Esperar Después
• Su piel puede verse ligeramente amarilla/naranja por varias horas — normal.
• Su orina será naranja/amarillo brillante por 24–48 horas — es el colorante siendo filtrado, completamente normal.
• Náusea leve durante la inyección es común y breve.

Riesgos
• Náusea: Malestar breve en ~5% de pacientes.
• Reacción alérgica: Reacciones leves son poco comunes. Reacciones severas son muy raras (~1 en 200,000).

Notas Importantes
• La fluoresceína NO es lo mismo que el contraste yodado (tomografías). Si es alérgico al contraste de CT o mariscos, puede hacerse esta prueba.
• Esta prueba NO usa radiación.`,

      vi: `CHỤP MẠCH HUỲNH QUANG (FA)

Chụp Mạch Huỳnh Quang Là Gì?
Xét nghiệm chẩn đoán sử dụng thuốc nhuộm đặc biệt và máy ảnh để chụp mạch máu võng mạc. Giúp xác định mạch rò rỉ, mạch tắc và tăng sinh mạch bất thường.

Tại Sao Làm Xét Nghiệm Này?
Để đánh giá: bệnh võng mạc đái tháo đường, AMD ướt, tắc tĩnh mạch võng mạc, phù hoàng điểm, mất thị lực không rõ nguyên nhân, u hoặc viêm.

Trước Xét Nghiệm
• Đồng tử sẽ được giãn.
• Thông báo bác sĩ về bất kỳ dị ứng nào, đặc biệt với thuốc nhuộm.
• Có thể ăn uống bình thường.
• Xét nghiệm mất khoảng 15–30 phút.

Trong Khi Xét Nghiệm
• Kim nhỏ được đặt ở cánh tay hoặc bàn tay.
• Thuốc nhuộm fluorescein (vàng cam sáng) được tiêm vào tĩnh mạch.
• Khi thuốc đến mắt (~10–15 giây), máy ảnh đặc biệt chụp nhanh.

Sau Xét Nghiệm
• Da có thể hơi vàng/cam vài giờ — bình thường.
• Nước tiểu sẽ cam/vàng sáng 24–48 giờ — thuốc nhuộm đang được lọc, hoàn toàn bình thường.
• Buồn nôn nhẹ khi tiêm phổ biến và ngắn.

Rủi Ro
• Buồn nôn: Ngắn ở ~5% bệnh nhân.
• Dị ứng: Phản ứng nhẹ hiếm gặp. Phản ứng nặng rất hiếm (~1/200.000).

Lưu Ý Quan Trọng
• Fluorescein KHÔNG giống thuốc cản quang iốt (CT). Nếu bạn dị ứng cản quang CT hoặc hải sản, vẫn có thể làm xét nghiệm này.
• Xét nghiệm KHÔNG dùng bức xạ.`,

      pt: `ANGIOGRAFIA FLUORESCEÍNICA (FA)

O Que É Angiografia Fluoresceínica?
Um exame diagnóstico que usa um corante especial e câmera para fotografar os vasos sanguíneos da retina. Ajuda a identificar vasos com vazamento, vasos bloqueados e crescimento anormal de novos vasos.

Por Que Este Exame É Feito?
Para avaliar: retinopatia diabética, DMRI úmida, oclusão venosa retiniana, edema macular, perda de visão inexplicada, tumores ou inflamação.

Antes do Exame
• Suas pupilas serão dilatadas.
• Informe seu médico sobre qualquer alergia, particularmente a corantes.
• Pode comer e beber normalmente.
• O exame leva cerca de 15–30 minutos.

Durante o Exame
• Uma pequena agulha é colocada no braço ou mão.
• O corante fluoresceína (amarelo-laranja brilhante) é injetado na veia.
• Quando o corante chega aos olhos (~10–15 segundos), uma câmera especial tira fotografias rápidas.

O Que Esperar Depois
• Sua pele pode ficar levemente amarela/laranja por várias horas — normal.
• Sua urina ficará laranja/amarelo brilhante por 24–48 horas — é o corante sendo filtrado, completamente normal.
• Náusea leve durante a injeção é comum e breve.

Riscos
• Náusea: Breve em ~5% dos pacientes.
• Reação alérgica: Reações leves são incomuns. Reações severas são muito raras (~1 em 200.000).

Notas Importantes
• Fluoresceína NÃO é o mesmo que contraste iodado (tomografia). Se você é alérgico a contraste de CT ou frutos do mar, ainda pode fazer este exame.
• Este exame NÃO usa radiação.`
    }
  },
  {
    id: "proc-pdt",
    category: "procedure",
    title: { en: "Photodynamic Therapy (PDT)", es: "Terapia Fotodinámica (PDT)", vi: "Liệu Pháp Quang Động (PDT)", pt: "Terapia Fotodinâmica (PDT)" },
    tags: ["PDT", "Visudyne", "verteporfin", "laser", "CSR"],
    content: {
      en: `PHOTODYNAMIC THERAPY (PDT)

What Is PDT?
PDT uses a light-sensitive medication (verteporfin/Visudyne) and a low-energy laser to treat abnormal blood vessels or fluid leakage in the retina. Commonly used for central serous retinopathy (CSR), polypoidal choroidal vasculopathy, and certain types of wet AMD.

How It Works
1. Verteporfin (Visudyne) is infused into your vein over 10 minutes.
2. The medication collects in abnormal blood vessels.
3. A low-energy laser activates the medication.
4. The activated medication damages only the targeted abnormal vessels.

Before the Procedure
• An IV line will be placed in your arm.
• Your pupils will be dilated.
• The entire procedure takes about 30 minutes.

During the Procedure
• The verteporfin infusion runs for 10 minutes.
• Five minutes after infusion ends, the laser is applied through a contact lens.
• The laser application takes about 83 seconds.
• You should feel no pain.

After — IMPORTANT SUN PRECAUTIONS
The verteporfin makes your skin and eyes VERY sensitive to sunlight for 48 hours.

For 48 HOURS after treatment, you MUST:
• Avoid direct sunlight and bright indoor lights.
• Wear dark sunglasses, long sleeves, pants, wide-brimmed hat, and gloves outdoors.
• Do NOT sunbathe or sit near uncovered windows.
• Regular indoor lighting (lamps, overhead lights) is fine.
• Limit driving — your windshield does NOT provide enough protection.

Why Sun Precautions Matter
The medication remains in your bloodstream for ~48 hours. Sunlight exposure can activate it in your skin, causing a severe sunburn-like reaction.

After 48 hours, you can gradually resume normal sun exposure.

Follow-Up
• Response is checked at 4–6 weeks.
• Some patients need repeat treatments.
• PDT may be combined with eye injections for best results.`,

      es: `TERAPIA FOTODINÁMICA (PDT)

¿Qué Es la PDT?
La PDT usa un medicamento fotosensible (verteporfina/Visudyne) y un láser de baja energía para tratar vasos sanguíneos anormales o filtración de líquido en la retina. Se usa comúnmente para coriorretinopatía serosa central (CSR), vasculopatía coroidea polipoidal y ciertos tipos de DMAE húmeda.

Cómo Funciona
1. Se infunde verteporfina (Visudyne) en su vena durante 10 minutos.
2. El medicamento se acumula en los vasos sanguíneos anormales.
3. Un láser de baja energía activa el medicamento.
4. El medicamento activado daña solo los vasos anormales específicos.

Durante el Procedimiento
• La infusión dura 10 minutos.
• Cinco minutos después, se aplica el láser a través de un lente de contacto.
• La aplicación del láser toma unos 83 segundos.
• No debe sentir dolor.

Después — PRECAUCIONES SOLARES IMPORTANTES
La verteporfina hace que su piel y ojos sean MUY sensibles a la luz solar durante 48 horas.

Durante 48 HORAS después del tratamiento, DEBE:
• Evitar la luz solar directa y luces interiores brillantes.
• Usar gafas oscuras, mangas largas, pantalones, sombrero de ala ancha y guantes al aire libre.
• NO tomar sol ni sentarse cerca de ventanas descubiertas.
• La iluminación interior regular es segura.
• Limitar la conducción — el parabrisas NO proporciona suficiente protección.

Después de 48 horas, puede retomar gradualmente la exposición solar normal.`,

      vi: `LIỆU PHÁP QUANG ĐỘNG (PDT)

PDT Là Gì?
PDT sử dụng thuốc nhạy sáng (verteporfin/Visudyne) và laser năng lượng thấp để điều trị mạch máu bất thường hoặc rò rỉ dịch trong võng mạc. Thường dùng cho bệnh võng mạc thanh dịch trung tâm (CSR), bệnh mạch máu dạng polyp và một số loại AMD ướt.

Cách Hoạt Động
1. Verteporfin (Visudyne) được truyền vào tĩnh mạch trong 10 phút.
2. Thuốc tập trung trong mạch máu bất thường.
3. Laser năng lượng thấp kích hoạt thuốc.
4. Thuốc được kích hoạt chỉ phá hủy mạch bất thường mục tiêu.

Trong Khi Thủ Thuật
• Truyền verteporfin mất 10 phút.
• Năm phút sau truyền, laser được chiếu qua kính tiếp xúc.
• Chiếu laser mất khoảng 83 giây.
• Bạn không cảm thấy đau.

Sau — LƯU Ý QUAN TRỌNG VỀ ÁNH NẮNG
Verteporfin làm da và mắt RẤT nhạy cảm với ánh nắng trong 48 giờ.

Trong 48 GIỜ sau điều trị, bạn PHẢI:
• Tránh ánh nắng trực tiếp và đèn sáng trong nhà.
• Mang kính râm đậm, áo dài tay, quần dài, mũ rộng vành và găng tay khi ra ngoài.
• KHÔNG tắm nắng hoặc ngồi gần cửa sổ không che.
• Đèn trong nhà bình thường là an toàn.
• Hạn chế lái xe — kính chắn gió KHÔNG đủ bảo vệ.

Sau 48 giờ, bạn có thể dần tiếp xúc ánh nắng bình thường.`,

      pt: `TERAPIA FOTODINÂMICA (PDT)

O Que É PDT?
PDT usa um medicamento fotossensível (verteporfina/Visudyne) e laser de baixa energia para tratar vasos sanguíneos anormais ou vazamento na retina. Comumente usado para coriorretinopatia serosa central (CSR), vasculopatia coroidal polipoidal e certos tipos de DMRI úmida.

Como Funciona
1. Verteporfina (Visudyne) é infundida na veia por 10 minutos.
2. O medicamento se acumula nos vasos anormais.
3. Um laser de baixa energia ativa o medicamento.
4. O medicamento ativado danifica apenas os vasos anormais alvo.

Durante o Procedimento
• A infusão dura 10 minutos.
• Cinco minutos depois, o laser é aplicado através de lente de contato.
• A aplicação do laser leva cerca de 83 segundos.
• Você não deve sentir dor.

Após — PRECAUÇÕES SOLARES IMPORTANTES
A verteporfina torna pele e olhos MUITO sensíveis à luz solar por 48 horas.

Por 48 HORAS após o tratamento, você DEVE:
• Evitar luz solar direta e luzes internas brilhantes.
• Usar óculos escuros, mangas longas, calças, chapéu de aba larga e luvas ao ar livre.
• NÃO tomar sol ou sentar perto de janelas descobertas.
• Iluminação interna regular é segura.
• Limitar direção — o para-brisa NÃO fornece proteção suficiente.

Após 48 horas, pode retomar gradualmente a exposição solar normal.`
    }
  },
  {
    id: "proc-valeda",
    category: "procedure",
    title: { en: "Valeda Light Delivery System (Photobiomodulation)", es: "Sistema Valeda (Fotobiomodulación)", vi: "Hệ Thống Ánh Sáng Valeda (Quang Sinh Học)", pt: "Sistema Valeda (Fotobiomodulação)" },
    tags: ["Valeda", "PBM", "photobiomodulation", "dry AMD", "light therapy"],
    content: {
      en: `VALEDA LIGHT DELIVERY SYSTEM (PHOTOBIOMODULATION)

What Is Valeda / Photobiomodulation (PBM)?
Valeda is an FDA-cleared light therapy device that uses specific wavelengths of light to stimulate healing in the retina. Photobiomodulation (PBM) works at the cellular level to improve mitochondrial function, reduce inflammation, and support retinal health. It is used for dry age-related macular degeneration (dry AMD) and may help slow disease progression.

How It Works
• The Valeda device delivers precisely calibrated wavelengths of light (yellow, red, and near-infrared) to the retina and surrounding tissues.
• These wavelengths stimulate cytochrome c oxidase in the mitochondria of retinal cells, boosting cellular energy production.
• This can reduce oxidative stress, decrease inflammation, and improve retinal cell function.

What Is It Used For?
• Intermediate dry AMD (to help slow progression).
• Patients with drusen and/or early geographic atrophy.
• As a complement to other treatments (AREDS2 vitamins, lifestyle modifications).

The Treatment Experience
• Treatments are performed in the office.
• You sit comfortably with your chin on a rest (similar to other eye exams).
• The device delivers light to both eyes — you simply look at the light.
• Each session takes approximately 4–5 minutes per eye.
• The treatment is completely painless — no drops, no needles, no contact with the eye.
• A typical course is 3 sessions per week for 3–4 weeks, then maintenance sessions as recommended.

What to Expect
• There is no downtime — you can drive and resume all activities immediately.
• Most patients notice no sensation during treatment.
• Benefits develop gradually over the treatment course.
• Your doctor will monitor your progress with OCT imaging.

Safety
• PBM has been studied in multiple clinical trials and has a strong safety profile.
• No significant side effects have been reported.
• The light intensities used are well below levels that could cause damage.

Important Notes
• Valeda is not a cure for AMD — it is a supportive therapy to help maintain retinal health.
• Continue your AREDS2 vitamins and follow all other recommendations from your doctor.
• Consistent attendance at treatment sessions gives the best results.
• Results vary between patients.`,

      es: `SISTEMA VALEDA (FOTOBIOMODULACIÓN)

¿Qué Es Valeda / Fotobiomodulación (PBM)?
Valeda es un dispositivo de terapia con luz aprobado por la FDA que usa longitudes de onda específicas para estimular la curación en la retina. La fotobiomodulación (PBM) actúa a nivel celular para mejorar la función mitocondrial, reducir la inflamación y apoyar la salud retiniana. Se usa para la degeneración macular seca relacionada con la edad (DMAE seca).

Cómo Funciona
• El dispositivo Valeda emite longitudes de onda calibradas (amarillo, rojo e infrarrojo cercano) a la retina y tejidos circundantes.
• Estas longitudes estimulan la citocromo c oxidasa en las mitocondrias de las células retinianas, aumentando la producción de energía celular.
• Esto reduce el estrés oxidativo, disminuye la inflamación y mejora la función celular retiniana.

La Experiencia del Tratamiento
• Los tratamientos se realizan en el consultorio.
• Se sienta cómodamente con su mentón en un soporte.
• El dispositivo emite luz a ambos ojos — simplemente mire la luz.
• Cada sesión toma aproximadamente 4–5 minutos por ojo.
• El tratamiento es completamente indoloro — sin gotas, sin agujas, sin contacto con el ojo.
• Un curso típico es 3 sesiones por semana durante 3–4 semanas, luego sesiones de mantenimiento.

Qué Esperar
• No hay tiempo de recuperación — puede conducir y reanudar todas las actividades inmediatamente.
• La mayoría de los pacientes no notan sensación durante el tratamiento.
• Los beneficios se desarrollan gradualmente.
• Su médico monitoreará su progreso con imágenes OCT.

Notas Importantes
• Valeda no es una cura para la DMAE — es una terapia de apoyo.
• Continúe sus vitaminas AREDS2 y siga todas las recomendaciones de su médico.
• La asistencia constante da los mejores resultados.`,

      vi: `HỆ THỐNG ÁNH SÁNG VALEDA (QUANG SINH HỌC)

Valeda / Quang Sinh Học (PBM) Là Gì?
Valeda là thiết bị trị liệu bằng ánh sáng được FDA chấp thuận, sử dụng bước sóng ánh sáng cụ thể để kích thích chữa lành võng mạc. Quang sinh học (PBM) hoạt động ở cấp tế bào để cải thiện chức năng ty thể, giảm viêm và hỗ trợ sức khỏe võng mạc. Được dùng cho thoái hóa hoàng điểm khô do tuổi (AMD khô).

Cách Hoạt Động
• Thiết bị Valeda phát các bước sóng ánh sáng được hiệu chuẩn chính xác (vàng, đỏ và cận hồng ngoại) đến võng mạc.
• Các bước sóng này kích thích cytochrome c oxidase trong ty thể tế bào võng mạc, tăng sản xuất năng lượng tế bào.
• Điều này giảm stress oxy hóa, giảm viêm và cải thiện chức năng tế bào võng mạc.

Trải Nghiệm Điều Trị
• Điều trị được thực hiện tại phòng khám.
• Bạn ngồi thoải mái với cằm trên giá đỡ.
• Thiết bị chiếu ánh sáng vào cả hai mắt — bạn chỉ cần nhìn vào ánh sáng.
• Mỗi buổi mất khoảng 4–5 phút mỗi mắt.
• Hoàn toàn không đau — không thuốc nhỏ, không kim, không tiếp xúc với mắt.
• Liệu trình điển hình: 3 buổi/tuần trong 3–4 tuần, sau đó các buổi duy trì.

Điều Cần Biết
• Không cần nghỉ ngơi — có thể lái xe và tiếp tục mọi hoạt động ngay.
• Hầu hết bệnh nhân không cảm thấy gì trong điều trị.
• Lợi ích phát triển dần dần.
• Bác sĩ sẽ theo dõi tiến triển bằng hình ảnh OCT.

Lưu Ý Quan Trọng
• Valeda không phải là cách chữa AMD — là liệu pháp hỗ trợ.
• Tiếp tục vitamin AREDS2 và tuân theo mọi khuyến nghị của bác sĩ.
• Tham dự đều đặn cho kết quả tốt nhất.`,

      pt: `SISTEMA VALEDA (FOTOBIOMODULAÇÃO)

O Que É Valeda / Fotobiomodulação (PBM)?
Valeda é um dispositivo de terapia com luz aprovado pela FDA que usa comprimentos de onda específicos para estimular a cura na retina. A fotobiomodulação (PBM) atua no nível celular para melhorar a função mitocondrial, reduzir inflamação e apoiar a saúde retiniana. É usado para degeneração macular seca relacionada à idade (DMRI seca).

Como Funciona
• O dispositivo Valeda emite comprimentos de onda calibrados (amarelo, vermelho e infravermelho próximo) para a retina.
• Esses comprimentos estimulam a citocromo c oxidase nas mitocôndrias das células retinianas, aumentando a produção de energia celular.
• Isso reduz o estresse oxidativo, diminui a inflamação e melhora a função celular.

A Experiência do Tratamento
• Tratamentos são realizados no consultório.
• Você senta confortavelmente com o queixo em um apoio.
• O dispositivo emite luz para ambos os olhos — simplesmente olhe para a luz.
• Cada sessão leva aproximadamente 4–5 minutos por olho.
• Completamente indolor — sem colírios, sem agulhas, sem contato com o olho.
• Curso típico: 3 sessões por semana por 3–4 semanas, depois sessões de manutenção.

O Que Esperar
• Sem tempo de recuperação — pode dirigir e retomar atividades imediatamente.
• A maioria dos pacientes não sente nada durante o tratamento.
• Benefícios se desenvolvem gradualmente.

Notas Importantes
• Valeda não é cura para DMRI — é terapia de suporte.
• Continue vitaminas AREDS2 e siga todas as recomendações do médico.
• Frequência constante dá os melhores resultados.`
    }
  },
  {
    id: "proc-vitrectomy",
    category: "procedure",
    title: { en: "Vitrectomy Surgery", es: "Cirugía de Vitrectomía", vi: "Phẫu Thuật Cắt Dịch Kính", pt: "Cirurgia de Vitrectomia" },
    tags: ["surgery", "vitrectomy", "OR"],
    content: {
      en: `VITRECTOMY SURGERY — WHAT TO EXPECT

What Is a Vitrectomy?
A vitrectomy removes the vitreous gel (clear jelly filling the eye) so your surgeon can access and repair problems at the back of the eye — retinal detachments, macular holes, epiretinal membranes, vitreous hemorrhage, or other retinal conditions.

Before Surgery
• Pre-operative assessment; may need blood work or medical clearance.
• Follow fasting instructions — typically nothing to eat or drink after midnight.
• Continue regular medications unless your surgeon advises otherwise.
• Arrange transportation — you cannot drive yourself home.

During Surgery
• Performed in the operating room under local or general anesthesia.
• Three tiny incisions (less than 1 mm) are made in the white part of the eye.
• The vitreous gel is removed and replaced with saline, air, or a gas bubble.
• Surgery typically takes 30 minutes to 2 hours depending on complexity.

After Surgery
• You may need specific head positioning (face-down) if a gas bubble was used.
• Use prescribed eye drops as directed (antibiotic and anti-inflammatory).
• Wear the eye shield at night for 1–2 weeks.
• Avoid heavy lifting, straining, or bending at the waist for 2 weeks.

If a Gas Bubble Was Placed
• You CANNOT fly until the gas bubble dissolves (usually 2–8 weeks).
• Inform any anesthesiologist if you need other surgery — nitrous oxide must be avoided.
• The bubble gradually shrinks and is replaced by your eye's own fluid.

Recovery
• Vision improvement is gradual — may take weeks to months.
• Mild discomfort, redness, and tearing are normal for the first week.
• Most patients return to light activities within a few days, normal activities within 2–4 weeks.

Call Your Doctor If
• Severe pain not relieved by prescribed medication.
• Significant vision loss.
• Increasing redness or discharge.
• Flashes, new floaters, or a shadow/curtain in your vision.`,

      es: `CIRUGÍA DE VITRECTOMÍA

¿Qué Es una Vitrectomía?
Una vitrectomía remueve el gel vítreo (la gelatina transparente que llena el ojo) para que el cirujano pueda acceder y reparar problemas en la parte posterior del ojo — desprendimientos de retina, agujeros maculares, membranas epirretinianas, hemorragia vítrea u otras condiciones.

Antes de la Cirugía
• Evaluación preoperatoria; puede necesitar análisis de sangre.
• Siga las instrucciones de ayuno — típicamente nada de comer o beber después de medianoche.
• Continúe medicamentos regulares a menos que el cirujano indique lo contrario.
• Organice transporte — no puede conducir a casa.

Durante la Cirugía
• Se realiza en quirófano bajo anestesia local o general.
• Se hacen tres incisiones diminutas (menos de 1 mm).
• El gel vítreo se remueve y se reemplaza con solución salina, aire o una burbuja de gas.
• La cirugía típicamente toma 30 minutos a 2 horas.

Después de la Cirugía
• Puede necesitar posicionamiento específico (boca abajo) si se usó burbuja de gas.
• Use las gotas recetadas según indicaciones.
• Use el protector ocular de noche por 1–2 semanas.
• Evite levantar peso, esfuerzo o agacharse por 2 semanas.

Si Se Colocó una Burbuja de Gas
• NO puede volar hasta que la burbuja se disuelva (2–8 semanas).
• Informe a cualquier anestesiólogo si necesita otra cirugía.

Recuperación
• La mejoría visual es gradual — puede tomar semanas a meses.
• Molestia leve, enrojecimiento y lagrimeo son normales la primera semana.

Llame a su Médico Si
• Dolor severo no aliviado por medicación.
• Pérdida significativa de visión.
• Enrojecimiento creciente o secreción.
• Destellos, nuevas moscas volantes o cortina en su visión.`,

      vi: `PHẪU THUẬT CẮT DỊCH KÍNH

Cắt Dịch Kính Là Gì?
Cắt dịch kính loại bỏ gel dịch kính (chất keo trong suốt bên trong mắt) để phẫu thuật viên tiếp cận và sửa chữa vấn đề phía sau mắt — bong võng mạc, lỗ hoàng điểm, màng trước võng mạc, xuất huyết dịch kính hoặc các bệnh võng mạc khác.

Trước Phẫu Thuật
• Đánh giá trước mổ; có thể cần xét nghiệm máu.
• Tuân theo hướng dẫn nhịn ăn — thường không ăn uống sau nửa đêm.
• Tiếp tục thuốc thường ngày trừ khi phẫu thuật viên nói khác.
• Sắp xếp người đưa đón — không thể tự lái xe về.

Trong Phẫu Thuật
• Thực hiện trong phòng mổ dưới gây tê tại chỗ hoặc gây mê toàn thân.
• Ba vết rạch nhỏ (dưới 1 mm) được tạo trên phần trắng mắt.
• Gel dịch kính được loại bỏ và thay bằng nước muối, khí hoặc bong bóng khí.
• Phẫu thuật thường mất 30 phút đến 2 giờ.

Sau Phẫu Thuật
• Có thể cần tư thế đặc biệt (úp mặt) nếu dùng bong bóng khí.
• Dùng thuốc nhỏ theo chỉ dẫn.
• Đeo tấm che mắt ban đêm 1–2 tuần.
• Tránh nâng nặng, gắng sức hoặc cúi người 2 tuần.

Nếu Có Bong Bóng Khí
• KHÔNG được bay cho đến khi bong bóng tan (thường 2–8 tuần).
• Thông báo bác sĩ gây mê nếu cần phẫu thuật khác.

Gọi Bác Sĩ Nếu
• Đau nặng không giảm với thuốc.
• Mất thị lực đáng kể.
• Đỏ mắt tăng hoặc dịch tiết.
• Ánh sáng lóe, đốm đen mới hoặc bóng/màn trong tầm nhìn.`,

      pt: `CIRURGIA DE VITRECTOMIA

O Que É Vitrectomia?
A vitrectomia remove o gel vítreo (geleia transparente que preenche o olho) para que o cirurgião acesse e repare problemas na parte posterior do olho — descolamentos de retina, buracos maculares, membranas epirretinianas, hemorragia vítrea ou outras condições.

Antes da Cirurgia
• Avaliação pré-operatória; pode precisar de exames de sangue.
• Siga instruções de jejum — tipicamente nada para comer ou beber após meia-noite.
• Continue medicamentos regulares, a menos que o cirurgião oriente diferente.
• Providencie transporte — não pode dirigir para casa.

Durante a Cirurgia
• Realizada no centro cirúrgico sob anestesia local ou geral.
• Três incisões minúsculas (menos de 1 mm) são feitas na parte branca do olho.
• O gel vítreo é removido e substituído por soro, ar ou bolha de gás.
• A cirurgia tipicamente leva 30 minutos a 2 horas.

Após a Cirurgia
• Pode precisar de posicionamento específico (face para baixo) se bolha de gás foi usada.
• Use colírios prescritos conforme orientação.
• Use protetor ocular à noite por 1–2 semanas.
• Evite levantar peso, esforço ou curvar-se por 2 semanas.

Se Uma Bolha de Gás Foi Colocada
• NÃO pode voar até a bolha dissolver (2–8 semanas).
• Informe qualquer anestesista se precisar de outra cirurgia.

Ligue para o Médico Se
• Dor severa não aliviada por medicação.
• Perda significativa de visão.
• Vermelhidão crescente ou secreção.
• Flashes, moscas volantes novas ou cortina na visão.`
    }
  },
  {
    id: "proc-buckle",
    category: "procedure",
    title: { en: "Scleral Buckle Surgery", es: "Cirugía de Cerclaje Escleral", vi: "Phẫu Thuật Đai Củng Mạc", pt: "Cirurgia de Introflexão Escleral" },
    tags: ["scleral buckle", "retinal detachment", "surgery"],
    content: {
      en: `SCLERAL BUCKLE SURGERY

What Is a Scleral Buckle?
A scleral buckle is a surgical procedure to repair a retinal detachment. A silicone band is sewn onto the outside of the eye, gently pushing the eye wall inward to bring it back into contact with the detached retina.

When Is It Used?
• For retinal detachments caused by retinal tears, especially in younger patients or those who have not had cataract surgery.
• May be used alone or with vitrectomy, laser, or cryotherapy.

Before Surgery
• Performed in the operating room under local or general anesthesia.
• Nothing to eat or drink after midnight.
• Arrange transportation home.

During Surgery
• The surgeon identifies retinal tear(s).
• Cryotherapy (freezing) seals the tear(s).
• A silicone band or sponge is sewn onto the outside of the eye.
• Fluid under the retina may be drained.
• The band stays permanently (not visible, you won't feel it once healed).
• Surgery takes approximately 1–2 hours.

After Surgery
• Eye patch for 1 day.
• Use prescribed eye drops as directed.
• Pain is usually mild to moderate — medication will help.
• Eye will be red and swollen for 1–2 weeks.

Activity Restrictions
• No heavy lifting (>10 lbs) for 2–4 weeks.
• Avoid bending at the waist — bend at the knees instead.
• No swimming for 4 weeks.
• You may watch TV, read, and use your phone — these do not harm the eye.

Recovery
• Double vision is common in the first few weeks (from swelling) and usually resolves.
• Best final vision may take 3–6 months.
• If a gas bubble was also placed, you cannot fly until it dissolves.

Call Your Doctor If
• Severe or worsening pain.
• Significant decrease in vision.
• New flashes or increase in floaters.
• A new shadow or curtain in your vision.
• Fever, excessive redness, or discharge.

Success Rate
• ~85–90% success with a single operation. Some cases may require additional surgery.`,

      es: `CIRUGÍA DE CERCLAJE ESCLERAL

¿Qué Es un Cerclaje Escleral?
El cerclaje escleral es un procedimiento quirúrgico para reparar un desprendimiento de retina. Una banda de silicona se cose en el exterior del ojo, empujando suavemente la pared del ojo hacia adentro para ponerla en contacto con la retina desprendida.

¿Cuándo Se Usa?
• Para desprendimientos causados por desgarros retinianos, especialmente en pacientes jóvenes o sin cirugía de catarata previa.
• Puede usarse solo o con vitrectomía, láser o crioterapia.

Durante la Cirugía
• El cirujano identifica los desgarros retinianos.
• La crioterapia (congelamiento) sella los desgarros.
• Una banda de silicona se cose en el exterior del ojo.
• Se puede drenar líquido bajo la retina.
• La banda permanece permanentemente (no visible, no la sentirá).
• La cirugía toma 1–2 horas.

Después de la Cirugía
• Parche ocular por 1 día.
• Use gotas recetadas según indicaciones.
• El dolor es usualmente leve a moderado.
• El ojo estará rojo e hinchado por 1–2 semanas.

Restricciones de Actividad
• No levantar peso (>5 kg) por 2–4 semanas.
• Evite agacharse — doble las rodillas.
• No nadar por 4 semanas.
• Puede ver TV, leer y usar el teléfono.

Recuperación
• Visión doble es común las primeras semanas (por hinchazón) y usualmente se resuelve.
• La mejor visión final puede tomar 3–6 meses.

Llame a su Médico Si
• Dolor severo o que empeora.
• Disminución significativa de visión.
• Nuevos destellos o aumento de moscas volantes.
• Nueva sombra o cortina en su visión.

Tasa de Éxito
• ~85–90% con una sola operación.`,

      vi: `PHẪU THUẬT ĐAI CỦNG MẠC

Đai Củng Mạc Là Gì?
Đai củng mạc là phẫu thuật sửa chữa bong võng mạc. Một dải silicone được khâu bên ngoài mắt, nhẹ nhàng đẩy thành mắt vào trong để tiếp xúc lại với võng mạc bong.

Khi Nào Được Sử Dụng?
• Cho bong võng mạc do rách, đặc biệt ở bệnh nhân trẻ hoặc chưa mổ đục thủy tinh thể.
• Có thể dùng đơn lẻ hoặc kết hợp cắt dịch kính, laser hoặc áp lạnh.

Trong Phẫu Thuật
• Phẫu thuật viên xác định vết rách võng mạc.
• Áp lạnh bịt kín vết rách.
• Dải silicone được khâu bên ngoài mắt.
• Dịch dưới võng mạc có thể được hút.
• Dải đai ở lại vĩnh viễn (không nhìn thấy, không cảm nhận khi lành).
• Phẫu thuật mất khoảng 1–2 giờ.

Sau Phẫu Thuật
• Che mắt 1 ngày.
• Dùng thuốc nhỏ theo chỉ dẫn.
• Đau thường nhẹ đến vừa.
• Mắt đỏ và sưng 1–2 tuần.

Hạn Chế Hoạt Động
• Không nâng nặng (>5 kg) trong 2–4 tuần.
• Tránh cúi — gập đầu gối thay vì.
• Không bơi 4 tuần.
• Có thể xem TV, đọc sách và dùng điện thoại.

Hồi Phục
• Nhìn đôi phổ biến vài tuần đầu (do sưng) và thường hết.
• Thị lực tốt nhất có thể mất 3–6 tháng.

Gọi Bác Sĩ Nếu
• Đau nặng hoặc tăng.
• Giảm thị lực đáng kể.
• Ánh sáng lóe mới hoặc đốm đen tăng.
• Bóng hoặc màn mới trong tầm nhìn.`,

      pt: `CIRURGIA DE INTROFLEXÃO ESCLERAL

O Que É Introflexão Escleral?
É um procedimento cirúrgico para reparar descolamento de retina. Uma faixa de silicone é costurada no exterior do olho, empurrando suavemente a parede do olho para dentro para reconectar com a retina descolada.

Quando É Usado?
• Para descolamentos causados por rasgos retinianos, especialmente em pacientes jovens ou sem cirurgia de catarata prévia.
• Pode ser usado sozinho ou com vitrectomia, laser ou crioterapia.

Durante a Cirurgia
• O cirurgião identifica os rasgos retinianos.
• Crioterapia (congelamento) sela os rasgos.
• Uma faixa de silicone é costurada no exterior do olho.
• Líquido sob a retina pode ser drenado.
• A faixa permanece permanentemente (não visível, não sentirá).
• A cirurgia leva 1–2 horas.

Após a Cirurgia
• Curativo ocular por 1 dia.
• Use colírios prescritos conforme orientação.
• Dor geralmente leve a moderada.
• Olho ficará vermelho e inchado por 1–2 semanas.

Restrições de Atividade
• Não levantar peso (>5 kg) por 2–4 semanas.
• Evite curvar-se — dobre os joelhos.
• Não nadar por 4 semanas.
• Pode assistir TV, ler e usar celular.

Recuperação
• Visão dupla é comum nas primeiras semanas (do inchaço) e geralmente resolve.
• Melhor visão final pode levar 3–6 meses.

Ligue para o Médico Se
• Dor severa ou que piora.
• Diminuição significativa de visão.
• Novos flashes ou aumento de moscas volantes.
• Nova sombra ou cortina na visão.

Taxa de Sucesso
• ~85–90% com uma única operação.`
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "cond-wet-amd",
    category: "condition",
    title: { en: "Wet Age-Related Macular Degeneration (Wet AMD)", es: "Degeneración Macular Húmeda (DMAE Húmeda)", vi: "Thoái Hóa Hoàng Điểm Ướt (AMD Ướt)", pt: "Degeneração Macular Úmida (DMRI Úmida)" },
    tags: ["AMD", "wet", "macular degeneration", "anti-VEGF"],
    content: {
      en: `WET AGE-RELATED MACULAR DEGENERATION (WET AMD)

What Is Wet AMD?
In wet AMD, abnormal blood vessels grow under the retina and leak fluid or blood, causing rapid vision loss if untreated. It affects the macula — the central part of the retina responsible for sharp, detailed vision.

Symptoms
• Blurry or distorted central vision.
• Straight lines appear wavy (metamorphopsia).
• A dark or empty spot in the center of your vision.
• Difficulty reading, recognizing faces, or driving.
• Symptoms can develop suddenly.

Treatment
• Anti-VEGF injections — medications injected into the eye that block abnormal blood vessel growth and reduce leakage.
• Common medications: Eylea, Avastin, Lucentis, Vabysmo.
• Treatment starts with monthly injections, then may be extended.
• Early and consistent treatment gives the best chance of preserving vision.

What You Can Do
• Keep all scheduled appointments — even if vision feels stable.
• Use the Amsler grid daily to monitor for changes.
• Take AREDS2 vitamins as recommended.
• Do not smoke.
• Eat leafy greens (spinach, kale) and fish.

Prognosis
With consistent treatment, most patients can stabilize or improve their vision. The key is early detection and adherence to treatment.`,

      es: `DEGENERACIÓN MACULAR HÚMEDA (DMAE HÚMEDA)

¿Qué Es la DMAE Húmeda?
En la DMAE húmeda, vasos sanguíneos anormales crecen bajo la retina y filtran líquido o sangre, causando pérdida rápida de visión sin tratamiento. Afecta la mácula — la parte central de la retina responsable de la visión detallada.

Síntomas
• Visión central borrosa o distorsionada.
• Las líneas rectas se ven onduladas (metamorfopsia).
• Un punto oscuro o vacío en el centro de la visión.
• Dificultad para leer, reconocer caras o conducir.
• Los síntomas pueden aparecer súbitamente.

Tratamiento
• Inyecciones anti-VEGF — medicamentos que bloquean el crecimiento de vasos anormales.
• Medicamentos comunes: Eylea, Avastin, Lucentis, Vabysmo.
• El tratamiento comienza mensualmente, luego puede extenderse.

Lo Que Puede Hacer
• Asista a todas las citas programadas.
• Use la cuadrícula de Amsler diariamente.
• Tome vitaminas AREDS2 según recomendación.
• No fume.
• Coma vegetales de hoja verde y pescado.`,

      vi: `THOÁI HÓA HOÀNG ĐIỂM ƯỚT (AMD ƯỚT)

AMD Ướt Là Gì?
Trong AMD ướt, mạch máu bất thường mọc dưới võng mạc và rò rỉ dịch hoặc máu, gây mất thị lực nhanh nếu không điều trị. Nó ảnh hưởng hoàng điểm — phần trung tâm võng mạc chịu trách nhiệm thị lực sắc nét.

Triệu Chứng
• Mờ hoặc méo thị lực trung tâm.
• Đường thẳng trông lượn sóng.
• Đốm tối hoặc trống ở trung tâm tầm nhìn.
• Khó đọc, nhận diện khuôn mặt hoặc lái xe.
• Triệu chứng có thể xuất hiện đột ngột.

Điều Trị
• Tiêm anti-VEGF — thuốc chặn tăng trưởng mạch bất thường.
• Thuốc phổ biến: Eylea, Avastin, Lucentis, Vabysmo.
• Điều trị bắt đầu hàng tháng, sau có thể kéo dài.

Bạn Có Thể Làm Gì
• Giữ tất cả lịch hẹn — ngay cả khi thị lực ổn định.
• Dùng lưới Amsler hàng ngày để theo dõi thay đổi.
• Uống vitamin AREDS2 theo khuyến nghị.
• Không hút thuốc.
• Ăn rau lá xanh và cá.`,

      pt: `DEGENERAÇÃO MACULAR ÚMIDA (DMRI ÚMIDA)

O Que É DMRI Úmida?
Na DMRI úmida, vasos sanguíneos anormais crescem sob a retina e vazam fluido ou sangue, causando perda rápida de visão sem tratamento. Afeta a mácula — parte central da retina responsável pela visão detalhada.

Sintomas
• Visão central embaçada ou distorcida.
• Linhas retas parecem onduladas (metamorfopsia).
• Ponto escuro ou vazio no centro da visão.
• Dificuldade para ler, reconhecer rostos ou dirigir.
• Sintomas podem aparecer subitamente.

Tratamento
• Injeções anti-VEGF — medicamentos que bloqueiam crescimento de vasos anormais.
• Medicamentos comuns: Eylea, Avastin, Lucentis, Vabysmo.
• Tratamento começa mensalmente, depois pode ser estendido.

O Que Você Pode Fazer
• Compareça a todas as consultas agendadas.
• Use a grade de Amsler diariamente.
• Tome vitaminas AREDS2 conforme recomendado.
• Não fume.
• Coma vegetais verde-escuros e peixe.`
    }
  },
  {
    id: "cond-dry-amd",
    category: "condition",
    title: { en: "Dry Age-Related Macular Degeneration (Dry AMD)", es: "Degeneración Macular Seca (DMAE Seca)", vi: "Thoái Hóa Hoàng Điểm Khô (AMD Khô)", pt: "Degeneração Macular Seca (DMRI Seca)" },
    tags: ["AMD", "dry", "drusen", "AREDS"],
    content: {
      en: `DRY AGE-RELATED MACULAR DEGENERATION (DRY AMD)

What Is Dry AMD?
The most common form of AMD (~80–90% of cases). The macula thins and small yellow deposits called drusen accumulate. Vision loss is usually gradual.

Stages
• Early: Small drusen, usually no vision loss.
• Intermediate: Larger drusen and/or pigment changes. Mild vision changes may begin.
• Advanced (Geographic Atrophy): Areas of retina waste away, causing blind spots.

Monitoring
• Regular exams with OCT imaging.
• Amsler grid daily — report new distortion immediately (could signal conversion to wet AMD).

Treatment
• AREDS2 vitamins (Vitamin C, E, Lutein, Zeaxanthin, Zinc, Copper) — shown to reduce progression risk in intermediate AMD.
• For Geographic Atrophy: Newer treatments (Syfovre, Izervay) can slow progression. Ask your doctor if you are a candidate.
• Valeda photobiomodulation may also help — ask your doctor.

Lifestyle
• Do not smoke.
• Eat leafy greens, fish, and nuts.
• Exercise regularly, manage blood pressure and cholesterol.
• Wear UV-protective sunglasses outdoors.`,

      es: `DEGENERACIÓN MACULAR SECA (DMAE SECA)

¿Qué Es la DMAE Seca?
La forma más común de DMAE (~80–90% de casos). La mácula se adelgaza y se acumulan depósitos amarillos llamados drusas. La pérdida de visión es usualmente gradual.

Etapas
• Temprana: Drusas pequeñas, usualmente sin pérdida de visión.
• Intermedia: Drusas más grandes y/o cambios de pigmento.
• Avanzada (Atrofia Geográfica): Áreas de retina se deterioran, causando puntos ciegos.

Monitoreo
• Exámenes regulares con imagen OCT.
• Cuadrícula de Amsler diariamente — reporte distorsión nueva inmediatamente.

Tratamiento
• Vitaminas AREDS2 — reducen el riesgo de progresión en DMAE intermedia.
• Para Atrofia Geográfica: Tratamientos nuevos (Syfovre, Izervay) pueden retardar la progresión.
• Valeda (fotobiomodulación) también puede ayudar.

Estilo de Vida
• No fume.
• Coma vegetales de hoja verde, pescado y nueces.
• Ejercicio regular, controle presión arterial y colesterol.
• Use gafas con protección UV al aire libre.`,

      vi: `THOÁI HÓA HOÀNG ĐIỂM KHÔ (AMD KHÔ)

AMD Khô Là Gì?
Dạng AMD phổ biến nhất (~80–90% ca). Hoàng điểm mỏng đi và các cặn vàng nhỏ gọi là drusen tích tụ. Mất thị lực thường từ từ.

Giai Đoạn
• Sớm: Drusen nhỏ, thường không mất thị lực.
• Trung gian: Drusen lớn hơn và/hoặc thay đổi sắc tố.
• Nặng (Teo Địa Lý): Vùng võng mạc thoái hóa, gây điểm mù.

Theo Dõi
• Khám định kỳ với hình ảnh OCT.
• Lưới Amsler hàng ngày — báo ngay nếu thấy méo mới.

Điều Trị
• Vitamin AREDS2 — giảm nguy cơ tiến triển ở AMD trung gian.
• Cho Teo Địa Lý: Thuốc mới (Syfovre, Izervay) có thể làm chậm tiến triển.
• Valeda (quang sinh học) cũng có thể giúp.

Lối Sống
• Không hút thuốc.
• Ăn rau lá xanh, cá và hạt.
• Tập thể dục đều đặn, kiểm soát huyết áp và cholesterol.
• Mang kính chống UV khi ra ngoài.`,

      pt: `DEGENERAÇÃO MACULAR SECA (DMRI SECA)

O Que É DMRI Seca?
A forma mais comum de DMRI (~80–90% dos casos). A mácula afina e depósitos amarelos chamados drusas se acumulam. A perda de visão é geralmente gradual.

Estágios
• Inicial: Drusas pequenas, geralmente sem perda de visão.
• Intermediário: Drusas maiores e/ou alterações pigmentares.
• Avançado (Atrofia Geográfica): Áreas da retina se deterioram, causando pontos cegos.

Monitoramento
• Exames regulares com imagem OCT.
• Grade de Amsler diariamente — relate distorção nova imediatamente.

Tratamento
• Vitaminas AREDS2 — reduzem risco de progressão na DMRI intermediária.
• Para Atrofia Geográfica: Tratamentos novos (Syfovre, Izervay) podem retardar a progressão.
• Valeda (fotobiomodulação) também pode ajudar.

Estilo de Vida
• Não fume.
• Coma vegetais verde-escuros, peixe e nozes.
• Exercite-se regularmente, controle pressão arterial e colesterol.
• Use óculos com proteção UV ao ar livre.`
    }
  },
  {
    id: "cond-ga",
    category: "condition",
    title: { en: "Geographic Atrophy (Advanced Dry AMD)", es: "Atrofia Geográfica (DMAE Seca Avanzada)", vi: "Teo Địa Lý (AMD Khô Nặng)", pt: "Atrofia Geográfica (DMRI Seca Avançada)" },
    tags: ["geographic atrophy", "GA", "Syfovre", "Izervay", "advanced dry AMD"],
    content: {
      en: `GEOGRAPHIC ATROPHY (ADVANCED DRY AMD)

What Is Geographic Atrophy?
Geographic atrophy (GA) is the advanced stage of dry AMD where retinal cells permanently die (atrophy), creating areas of vision loss. It typically progresses slowly but can significantly impact reading, driving, and recognizing faces over time.

How Is It Different from Wet AMD?
• GA is a slow, gradual loss from cell death — not from leaking blood vessels.
• Wet AMD involves sudden fluid/blood leakage and is treated with anti-VEGF injections.
• You can have GA and later develop wet AMD — this is why Amsler grid monitoring remains important.

Symptoms
• Gradual worsening of central vision.
• Difficulty reading, especially in dim light.
• Need for brighter light.
• Trouble recognizing faces.
• Blank or blurry patches in your central vision that slowly enlarge.

New Treatments
For the first time, FDA-approved treatments can slow the growth of GA:

• Syfovre (pegcetacoplan): An injection given every 1–2 months that slows GA progression by inhibiting complement (part of the immune system that drives atrophy).
• Izervay (avacincaptad pegol): An injection given monthly that also targets complement to slow atrophy growth.

These treatments do NOT reverse existing damage but can significantly slow further loss. Your doctor will discuss whether you are a candidate based on your GA size, location, and other factors.

What You Can Do
• Keep all follow-up appointments for monitoring with OCT imaging.
• Use the Amsler grid daily — report any sudden changes (could mean wet AMD conversion).
• Take AREDS2 vitamins as recommended.
• Consider Valeda photobiomodulation as an additional supportive therapy.
• Use low-vision aids: magnifiers, large-print books, improved lighting, talking devices.
• Do not smoke.

Low Vision Resources
If GA has significantly impacted your daily activities, ask your doctor about a referral to a low-vision specialist. These specialists can help you maximize your remaining vision with specialized devices and training.`,

      es: `ATROFIA GEOGRÁFICA (DMAE SECA AVANZADA)

¿Qué Es la Atrofia Geográfica?
La atrofia geográfica (AG) es la etapa avanzada de la DMAE seca donde las células retinianas mueren permanentemente, creando áreas de pérdida de visión. Progresa lentamente pero puede impactar significativamente la lectura, conducción y reconocimiento facial.

Nuevos Tratamientos
Por primera vez, existen tratamientos aprobados que pueden retardar el crecimiento de la AG:

• Syfovre (pegcetacoplan): Inyección cada 1–2 meses que retarda la progresión.
• Izervay (avacincaptad pegol): Inyección mensual que también retarda el crecimiento de la atrofia.

Estos tratamientos NO revierten el daño existente pero pueden retardar significativamente la pérdida adicional.

Lo Que Puede Hacer
• Asista a todas las citas de seguimiento.
• Use la cuadrícula de Amsler diariamente.
• Tome vitaminas AREDS2.
• Considere Valeda (fotobiomodulación) como terapia complementaria.
• Use ayudas de baja visión: lupas, libros de letra grande, mejor iluminación.
• No fume.`,

      vi: `TEO ĐỊA LÝ (AMD KHÔ NẶNG)

Teo Địa Lý Là Gì?
Teo địa lý (GA) là giai đoạn nặng của AMD khô, khi tế bào võng mạc chết vĩnh viễn, tạo vùng mất thị lực. Thường tiến triển chậm nhưng ảnh hưởng đáng kể đến đọc, lái xe và nhận diện khuôn mặt.

Điều Trị Mới
Lần đầu tiên có thuốc được FDA phê duyệt có thể làm chậm tiến triển GA:

• Syfovre (pegcetacoplan): Tiêm mỗi 1–2 tháng.
• Izervay (avacincaptad pegol): Tiêm hàng tháng.

Các thuốc này KHÔNG đảo ngược tổn thương hiện có nhưng có thể làm chậm đáng kể mất thêm.

Bạn Có Thể Làm Gì
• Giữ tất cả lịch tái khám với hình ảnh OCT.
• Dùng lưới Amsler hàng ngày.
• Uống vitamin AREDS2.
• Cân nhắc Valeda (quang sinh học) như liệu pháp hỗ trợ.
• Dùng thiết bị hỗ trợ thị lực kém: kính lúp, sách chữ lớn, đèn sáng hơn.
• Không hút thuốc.`,

      pt: `ATROFIA GEOGRÁFICA (DMRI SECA AVANÇADA)

O Que É Atrofia Geográfica?
Atrofia geográfica (AG) é o estágio avançado da DMRI seca onde células retinianas morrem permanentemente, criando áreas de perda de visão. Progride lentamente mas pode impactar significativamente leitura, direção e reconhecimento facial.

Novos Tratamentos
Pela primeira vez, tratamentos aprovados podem retardar o crescimento da AG:

• Syfovre (pegcetacoplan): Injeção a cada 1–2 meses.
• Izervay (avacincaptad pegol): Injeção mensal.

Esses tratamentos NÃO revertem dano existente mas podem retardar significativamente perda adicional.

O Que Você Pode Fazer
• Compareça a todas as consultas de acompanhamento.
• Use a grade de Amsler diariamente.
• Tome vitaminas AREDS2.
• Considere Valeda (fotobiomodulação) como terapia complementar.
• Use auxílios de baixa visão: lupas, livros com letra grande, melhor iluminação.
• Não fume.`
    }
  },
  {
    id: "cond-dr",
    category: "condition",
    title: { en: "Diabetic Retinopathy", es: "Retinopatía Diabética", vi: "Bệnh Võng Mạc Đái Tháo Đường", pt: "Retinopatia Diabética" },
    tags: ["diabetes", "diabetic", "retinopathy", "DME"],
    content: {
      en: `DIABETIC RETINOPATHY

What Is It?
A complication of diabetes that damages retinal blood vessels. Leading cause of blindness in working-age adults, but manageable with early detection and treatment.

Stages
• Mild/Moderate Nonproliferative: Small hemorrhages and blocked vessels.
• Severe Nonproliferative: Many vessels blocked, retina signals for new vessel growth.
• Proliferative (PDR): Abnormal new vessels grow — can bleed or cause retinal detachment.

Diabetic Macular Edema (DME)
Fluid leaks into the macula at any stage, causing blurred central vision. Most common cause of vision loss from diabetic retinopathy.

Symptoms
• Often NO symptoms early — regular dilated exams are critical.
• Blurry or fluctuating vision, floaters, difficulty with colors, vision loss.

Treatment
• DME: Anti-VEGF injections (Eylea, Avastin, Vabysmo) and/or focal laser.
• PDR: PRP laser and/or anti-VEGF injections. Vitrectomy if bleeding or detachment.
• Most important: good blood sugar, blood pressure, and cholesterol control.

What You Can Do
• Keep A1c below 7% (or as directed).
• Control blood pressure and cholesterol.
• Do not smoke.
• Keep all scheduled eye appointments.
• Report new symptoms promptly.`,

      es: `RETINOPATÍA DIABÉTICA

¿Qué Es?
Una complicación de la diabetes que daña los vasos sanguíneos retinianos. Principal causa de ceguera en adultos en edad laboral, pero manejable con detección y tratamiento tempranos.

Edema Macular Diabético (EMD)
El líquido se filtra en la mácula, causando visión central borrosa. La causa más común de pérdida visual por retinopatía diabética.

Tratamiento
• EMD: Inyecciones anti-VEGF y/o láser focal.
• Proliferativa: Láser PRP y/o anti-VEGF. Vitrectomía si hay sangrado o desprendimiento.
• Lo más importante: buen control de azúcar, presión arterial y colesterol.

Lo Que Puede Hacer
• Mantenga A1c por debajo de 7%.
• Controle presión arterial y colesterol.
• No fume.
• Asista a todas las citas oftalmológicas.`,

      vi: `BỆNH VÕNG MẠC ĐÁI THÁO ĐƯỜNG

Là Gì?
Biến chứng đái tháo đường gây tổn thương mạch máu võng mạc. Nguyên nhân hàng đầu gây mù ở người trưởng thành trong độ tuổi lao động, nhưng kiểm soát được nếu phát hiện sớm.

Phù Hoàng Điểm Đái Tháo Đường (DME)
Dịch rò vào hoàng điểm, gây mờ thị lực trung tâm. Nguyên nhân mất thị lực phổ biến nhất từ bệnh võng mạc đái tháo đường.

Điều Trị
• DME: Tiêm anti-VEGF và/hoặc laser.
• Tăng sinh: Laser PRP và/hoặc anti-VEGF. Cắt dịch kính nếu chảy máu hoặc bong.
• Quan trọng nhất: kiểm soát đường huyết, huyết áp và cholesterol.

Bạn Có Thể Làm Gì
• Giữ A1c dưới 7%.
• Kiểm soát huyết áp và cholesterol.
• Không hút thuốc.
• Giữ tất cả lịch khám mắt.`,

      pt: `RETINOPATIA DIABÉTICA

O Que É?
Complicação do diabetes que danifica vasos sanguíneos retinianos. Principal causa de cegueira em adultos em idade laboral, mas controlável com detecção e tratamento precoces.

Edema Macular Diabético (EMD)
Fluido vaza para a mácula, causando visão central embaçada. Causa mais comum de perda visual por retinopatia diabética.

Tratamento
• EMD: Injeções anti-VEGF e/ou laser focal.
• Proliferativa: Laser PRP e/ou anti-VEGF. Vitrectomia se sangramento ou descolamento.
• Mais importante: bom controle de glicemia, pressão arterial e colesterol.

O Que Você Pode Fazer
• Mantenha A1c abaixo de 7%.
• Controle pressão arterial e colesterol.
• Não fume.
• Compareça a todas as consultas oftalmológicas.`
    }
  },
  {
    id: "cond-rvo",
    category: "condition",
    title: { en: "Retinal Vein Occlusion (RVO)", es: "Oclusión Venosa Retiniana", vi: "Tắc Tĩnh Mạch Võng Mạc", pt: "Oclusão Venosa Retiniana" },
    tags: ["RVO", "BRVO", "CRVO", "vein occlusion"],
    content: {
      en: `RETINAL VEIN OCCLUSION (RVO)

What Is It?
A retinal vein becomes blocked, causing blood and fluid to leak into the retina, resulting in swelling and vision loss.

Types
• Branch RVO (BRVO): A smaller branch vein is blocked. Usually affects part of vision.
• Central RVO (CRVO): The main vein is blocked. Can cause more significant vision loss.

Risk Factors
• High blood pressure (most common), diabetes, glaucoma, blood clotting disorders, age over 50.

Symptoms
• Sudden painless blurring or loss of vision in one eye, floaters, dark areas.

Treatment
• Anti-VEGF injections to reduce macular edema and improve vision.
• Steroid injections or implants in some cases.
• Laser if abnormal new vessels develop.
• Treat underlying conditions (blood pressure, diabetes).

Prognosis
• With treatment, many patients improve significantly. BRVO generally has better outcomes than CRVO. Regular follow-up may be needed for months to years.`,

      es: `OCLUSIÓN VENOSA RETINIANA

¿Qué Es?
Una vena retiniana se bloquea, causando filtración de sangre y líquido en la retina, resultando en hinchazón y pérdida de visión.

Tipos
• ORVR (rama): Una vena menor se bloquea. Usualmente afecta parte de la visión.
• OVCR (central): La vena principal se bloquea. Puede causar pérdida más significativa.

Factores de Riesgo
• Presión arterial alta (más común), diabetes, glaucoma, trastornos de coagulación, edad >50.

Tratamiento
• Inyecciones anti-VEGF para reducir edema y mejorar visión.
• Esteroides en algunos casos.
• Láser si se desarrollan nuevos vasos.
• Tratar condiciones subyacentes.`,

      vi: `TẮC TĨNH MẠCH VÕNG MẠC

Là Gì?
Tĩnh mạch võng mạc bị tắc, gây rò máu và dịch vào võng mạc, dẫn đến phù và mất thị lực.

Loại
• Tắc nhánh (BRVO): Tĩnh mạch nhỏ bị tắc. Thường ảnh hưởng một phần thị lực.
• Tắc trung tâm (CRVO): Tĩnh mạch chính bị tắc. Có thể gây mất thị lực đáng kể hơn.

Yếu Tố Nguy Cơ
• Tăng huyết áp (phổ biến nhất), đái tháo đường, glaucoma, rối loạn đông máu, trên 50 tuổi.

Điều Trị
• Tiêm anti-VEGF để giảm phù và cải thiện thị lực.
• Steroid trong một số trường hợp.
• Laser nếu mọc mạch bất thường.
• Điều trị bệnh nền.`,

      pt: `OCLUSÃO VENOSA RETINIANA

O Que É?
Uma veia retiniana fica bloqueada, causando vazamento de sangue e fluido na retina, resultando em inchaço e perda de visão.

Tipos
• ORVR (ramo): Veia menor bloqueada. Geralmente afeta parte da visão.
• OVCR (central): Veia principal bloqueada. Pode causar perda mais significativa.

Fatores de Risco
• Pressão alta (mais comum), diabetes, glaucoma, distúrbios de coagulação, idade >50.

Tratamento
• Injeções anti-VEGF para reduzir edema e melhorar visão.
• Esteroides em alguns casos.
• Laser se novos vasos se desenvolverem.
• Tratar condições subjacentes.`
    }
  },
  {
    id: "cond-pvd",
    category: "condition",
    title: { en: "Posterior Vitreous Detachment (PVD)", es: "Desprendimiento Vítreo Posterior (DVP)", vi: "Bong Dịch Kính Sau (PVD)", pt: "Descolamento Vítreo Posterior (DVP)" },
    tags: ["PVD", "floaters", "flashes", "vitreous"],
    content: {
      en: `POSTERIOR VITREOUS DETACHMENT (PVD)

What Is a PVD?
The vitreous is a clear gel that fills the inside of the eye. As we age, this gel naturally shrinks and eventually separates from the retina — this is called a posterior vitreous detachment (PVD). It is extremely common (most people over age 60 will develop one) and is usually harmless.

Symptoms
• New floaters — spots, cobwebs, rings, or strings in your vision.
• Flashes of light — brief sparkles or lightning streaks, especially in peripheral vision.
• These symptoms are usually most noticeable in the first few weeks and gradually improve.

Is It Dangerous?
• In most cases, a PVD is completely harmless and requires no treatment.
• HOWEVER, in about 10–15% of cases, the vitreous can pull hard enough on the retina to cause a retinal tear. A tear, if not treated, can lead to a retinal detachment.
• This is why NEW flashes and floaters always need a prompt dilated eye exam.

When to Call Immediately
• A sudden shower of many new floaters.
• Persistent flashes of light.
• A shadow, curtain, or dark area in your peripheral or central vision.
• Any sudden loss of vision.

These could indicate a retinal tear or detachment and need same-day evaluation.

What to Expect
• If your exam shows a PVD WITHOUT a retinal tear: No treatment is needed. The floaters and flashes usually become less noticeable over weeks to months as your brain adapts.
• If a retinal tear IS found: It can usually be treated in the office with laser — a quick, effective procedure that prevents detachment.
• Your doctor may schedule a follow-up exam in 4–6 weeks to ensure no delayed tear has developed.

Living with Floaters
• Floaters are annoying but harmless. Most people notice them less over time.
• They are more visible against light backgrounds (blue sky, white walls, reading).
• No vitamins or drops can make floaters go away.
• In rare cases of severely debilitating floaters, surgical options exist (discuss with your doctor).`,

      es: `DESPRENDIMIENTO VÍTREO POSTERIOR (DVP)

¿Qué Es un DVP?
El vítreo es un gel transparente que llena el interior del ojo. Con la edad, este gel se encoge naturalmente y eventualmente se separa de la retina. Es extremadamente común (la mayoría de personas mayores de 60 años lo desarrollarán) y usualmente es inofensivo.

Síntomas
• Nuevas moscas volantes — puntos, telarañas, anillos en su visión.
• Destellos de luz — chispas breves, especialmente en visión periférica.
• Estos síntomas son más notorios las primeras semanas y mejoran gradualmente.

¿Es Peligroso?
• En la mayoría de casos, es completamente inofensivo.
• PERO en ~10–15% de casos, el vítreo puede tirar lo suficiente para causar un desgarro retiniano. Un desgarro sin tratar puede llevar a desprendimiento.
• Por eso, nuevos destellos y moscas volantes siempre necesitan examen inmediato.

Cuándo Llamar Inmediatamente
• Aparición súbita de muchas moscas volantes nuevas.
• Destellos persistentes.
• Una sombra, cortina o área oscura en su visión.
• Cualquier pérdida súbita de visión.

Qué Esperar
• Sin desgarro: No necesita tratamiento. Los síntomas mejoran con el tiempo.
• Con desgarro: Se puede tratar con láser en el consultorio.
• Su doctor puede programar seguimiento en 4–6 semanas.`,

      vi: `BONG DỊCH KÍNH SAU (PVD)

PVD Là Gì?
Dịch kính là gel trong suốt bên trong mắt. Khi già đi, gel này co lại tự nhiên và cuối cùng tách khỏi võng mạc. Rất phổ biến (hầu hết người trên 60 tuổi sẽ gặp) và thường vô hại.

Triệu Chứng
• Đốm đen mới — chấm, mạng nhện, vòng trong tầm nhìn.
• Ánh sáng lóe — tia sáng ngắn, đặc biệt ở ngoại vi.
• Triệu chứng rõ nhất vài tuần đầu và cải thiện dần.

Có Nguy Hiểm Không?
• Hầu hết trường hợp hoàn toàn vô hại.
• NHƯNG khoảng 10–15% trường hợp, dịch kính có thể kéo gây rách võng mạc. Rách không điều trị có thể gây bong.
• Đó là lý do ánh sáng lóe và đốm đen MỚI luôn cần khám giãn đồng tử ngay.

Khi Nào Gọi Ngay
• Đốm đen mới xuất hiện đột ngột nhiều.
• Ánh sáng lóe liên tục.
• Bóng, màn hoặc vùng tối trong tầm nhìn.
• Mất thị lực đột ngột.

Điều Cần Biết
• Không có rách: Không cần điều trị. Triệu chứng giảm theo thời gian.
• Có rách: Thường điều trị bằng laser tại phòng khám.
• Bác sĩ có thể hẹn tái khám sau 4–6 tuần.`,

      pt: `DESCOLAMENTO VÍTREO POSTERIOR (DVP)

O Que É DVP?
O vítreo é um gel transparente dentro do olho. Com a idade, encolhe naturalmente e eventualmente se separa da retina. Extremamente comum (maioria das pessoas acima de 60 anos terá) e geralmente inofensivo.

Sintomas
• Moscas volantes novas — pontos, teias, anéis na visão.
• Flashes de luz — faíscas breves, especialmente na visão periférica.
• Sintomas mais perceptíveis nas primeiras semanas e melhoram gradualmente.

É Perigoso?
• Na maioria dos casos, completamente inofensivo.
• PORÉM em ~10–15% dos casos, o vítreo pode puxar o suficiente para causar rasgo retiniano. Rasgo não tratado pode levar a descolamento.
• Por isso, flashes e moscas volantes NOVOS sempre precisam exame imediato.

Quando Ligar Imediatamente
• Surgimento súbito de muitas moscas volantes novas.
• Flashes persistentes.
• Sombra, cortina ou área escura na visão.
• Qualquer perda súbita de visão.

O Que Esperar
• Sem rasgo: Não precisa tratamento. Sintomas melhoram com o tempo.
• Com rasgo: Geralmente tratado com laser no consultório.
• Médico pode agendar retorno em 4–6 semanas.`
    }
  },
  {
    id: "cond-cscr",
    category: "condition",
    title: { en: "Central Serous Chorioretinopathy (CSCR)", es: "Coriorretinopatía Serosa Central (CSC)", vi: "Bệnh Võng Mạc Thanh Dịch Trung Tâm (CSCR)", pt: "Coriorretinopatia Serosa Central (CSC)" },
    tags: ["CSCR", "CSR", "CSC", "serous", "stress"],
    content: {
      en: `CENTRAL SEROUS CHORIORETINOPATHY (CSCR)

What Is CSCR?
CSCR is a condition where fluid accumulates under the retina, causing a blister-like detachment of the macula. This leads to blurry or distorted central vision, usually in one eye.

Who Gets It?
• Most common in men ages 30–50.
• Associated with stress, type-A personality, and corticosteroid use.
• Risk factors: emotional or physical stress, steroid medications (oral, inhaled, nasal sprays, skin creams, joint injections), sleep apnea, hypertension.

Symptoms
• Blurry central vision in one eye.
• A dim or dark spot in the center of vision.
• Straight lines appear distorted or crooked.
• Objects may appear smaller in the affected eye.
• Colors may seem washed out or duller.

Diagnosis
• OCT imaging shows the fluid pocket under the retina.
• Fluorescein angiography may be performed to identify the leaking point.

Treatment
• Observation: Many cases (especially first episodes) resolve on their own within 3–6 months.
• Reduce stress: Stress management, adequate sleep, and lifestyle modifications can help.
• Discontinue steroids: If you are taking ANY form of steroid (pills, inhalers, creams, nasal sprays, joint injections), discuss with your doctors about safely stopping or switching to an alternative. This is the single most important step.
• Photodynamic Therapy (PDT): For chronic or recurrent cases that don't resolve. Low-dose PDT can seal the leak.
• Laser: Rarely used; only if the leak is far from the center of vision.

Important: Steroids and CSCR
• ALL forms of corticosteroids can cause or worsen CSCR — not just pills.
• This includes: prednisone/prednisolone pills, steroid inhalers (Flovent, Advair, Symbicort), nasal steroid sprays (Flonase, Nasacort), steroid skin creams (hydrocortisone, triamcinolone), joint or epidural steroid injections.
• Always tell your retina doctor about ALL steroid use.
• Work with your other doctors to find non-steroid alternatives when possible.

Prognosis
• Most first episodes resolve with good vision recovery.
• Recurrence is common (~30–50% of patients).
• Chronic CSCR (lasting >6 months) may cause permanent vision changes.`,

      es: `CORIORRETINOPATÍA SEROSA CENTRAL (CSC)

¿Qué Es la CSC?
Una condición donde se acumula líquido bajo la retina, causando un desprendimiento tipo ampolla de la mácula. Causa visión central borrosa o distorsionada, usualmente en un ojo.

¿Quién la Padece?
• Más común en hombres de 30–50 años.
• Asociada con estrés y uso de corticosteroides.
• Factores de riesgo: estrés, medicamentos esteroides (orales, inhalados, nasales, cremas, inyecciones articulares), apnea del sueño, hipertensión.

Tratamiento
• Observación: Muchos casos se resuelven solos en 3–6 meses.
• Reducir estrés: Manejo del estrés y sueño adecuado ayudan.
• Suspender esteroides: Si toma CUALQUIER forma de esteroide, discuta con sus médicos sobre alternativas. Este es el paso más importante.
• Terapia Fotodinámica (PDT): Para casos crónicos o recurrentes.

Importante: Esteroides y CSC
• TODAS las formas de corticosteroides pueden causar o empeorar la CSC.
• Incluye: pastillas, inhaladores, sprays nasales, cremas e inyecciones.
• Siempre informe a su retinólogo sobre TODO uso de esteroides.`,

      vi: `BỆNH VÕNG MẠC THANH DỊCH TRUNG TÂM (CSCR)

CSCR Là Gì?
Tình trạng dịch tích tụ dưới võng mạc, gây bong dạng bọng nước ở hoàng điểm. Dẫn đến mờ hoặc méo thị lực trung tâm, thường ở một mắt.

Ai Bị?
• Phổ biến nhất ở nam giới 30–50 tuổi.
• Liên quan đến stress và dùng corticosteroid.
• Yếu tố nguy cơ: stress, thuốc steroid (uống, hít, xịt mũi, kem, tiêm khớp), ngưng thở khi ngủ, tăng huyết áp.

Điều Trị
• Theo dõi: Nhiều ca tự hết trong 3–6 tháng.
• Giảm stress: Quản lý stress và ngủ đủ giấc.
• Ngừng steroid: Nếu dùng BẤT KỲ dạng steroid nào, thảo luận với bác sĩ về thay thế. Đây là bước quan trọng nhất.
• Liệu pháp quang động (PDT): Cho ca mãn tính hoặc tái phát.

Quan Trọng: Steroid và CSCR
• TẤT CẢ dạng corticosteroid có thể gây hoặc làm nặng CSCR.
• Bao gồm: thuốc viên, ống hít, xịt mũi, kem và tiêm.
• Luôn thông báo bác sĩ võng mạc về MỌI việc dùng steroid.`,

      pt: `CORIORRETINOPATIA SEROSA CENTRAL (CSC)

O Que É CSC?
Condição onde fluido se acumula sob a retina, causando descolamento tipo bolha da mácula. Causa visão central embaçada ou distorcida, geralmente em um olho.

Quem Desenvolve?
• Mais comum em homens de 30–50 anos.
• Associada a estresse e uso de corticosteroides.
• Fatores de risco: estresse, medicamentos esteroides (orais, inalados, nasais, cremes, injeções articulares), apneia do sono, hipertensão.

Tratamento
• Observação: Muitos casos se resolvem sozinhos em 3–6 meses.
• Reduzir estresse: Gerenciamento de estresse e sono adequado ajudam.
• Descontinuar esteroides: Se tomar QUALQUER forma de esteroide, discuta alternativas com seus médicos. Este é o passo mais importante.
• Terapia Fotodinâmica (PDT): Para casos crônicos ou recorrentes.

Importante: Esteroides e CSC
• TODAS as formas de corticosteroides podem causar ou piorar CSC.
• Inclui: comprimidos, inaladores, sprays nasais, cremes e injeções.
• Sempre informe seu retinólogo sobre TODO uso de esteroides.`
    }
  },
  {
    id: "cond-erm",
    category: "condition",
    title: { en: "Epiretinal Membrane (Macular Pucker)", es: "Membrana Epirretiniana", vi: "Màng Trước Võng Mạc", pt: "Membrana Epirretiniana" },
    tags: ["ERM", "macular pucker", "membrane"],
    content: {
      en: `EPIRETINAL MEMBRANE (MACULAR PUCKER)

What Is It?
A thin layer of scar-like tissue on the surface of the macula. As it contracts, it wrinkles the retina, causing distorted or blurry vision.

Causes
• Most commonly: normal aging. Also: after eye surgery, retinal tears, inflammation, or trauma.

Symptoms
• Mild: No symptoms (found incidentally). Moderate/Severe: Blurry or distorted central vision, wavy lines, difficulty reading.

Treatment
• Observation: Mild ERMs with good vision are monitored.
• Surgery (vitrectomy with membrane peel): When vision is significantly affected. The surgeon peels the membrane off the retina.

Outcomes
• Most patients improve in vision and distortion after surgery. Recovery takes weeks to months. Risks include cataract progression and (rarely) retinal tear.`,

      es: `MEMBRANA EPIRRETINIANA

¿Qué Es?
Una capa delgada de tejido cicatricial en la superficie de la mácula. Al contraerse, arruga la retina, causando visión distorsionada o borrosa.

Tratamiento
• Observación: Membranas leves con buena visión se monitorean.
• Cirugía (vitrectomía con pelado de membrana): Cuando la visión está significativamente afectada.

Resultados
• La mayoría de pacientes mejoran después de cirugía. Recuperación toma semanas a meses.`,

      vi: `MÀNG TRƯỚC VÕNG MẠC

Là Gì?
Lớp mô mỏng giống sẹo trên bề mặt hoàng điểm. Khi co lại, nó làm nhăn võng mạc, gây méo hoặc mờ thị lực.

Điều Trị
• Theo dõi: Màng nhẹ với thị lực tốt được theo dõi.
• Phẫu thuật (cắt dịch kính và bóc màng): Khi thị lực bị ảnh hưởng đáng kể.

Kết Quả
• Hầu hết bệnh nhân cải thiện sau phẫu thuật. Hồi phục mất vài tuần đến tháng.`,

      pt: `MEMBRANA EPIRRETINIANA

O Que É?
Camada fina de tecido cicatricial na superfície da mácula. Ao contrair, enruga a retina, causando visão distorcida ou embaçada.

Tratamento
• Observação: Membranas leves com boa visão são monitoradas.
• Cirurgia (vitrectomia com remoção de membrana): Quando visão está significativamente afetada.

Resultados
• Maioria dos pacientes melhora após cirurgia. Recuperação leva semanas a meses.`
    }
  },
  {
    id: "cond-macular-hole",
    category: "condition",
    title: { en: "Macular Hole", es: "Agujero Macular", vi: "Lỗ Hoàng Điểm", pt: "Buraco Macular" },
    tags: ["macular hole", "surgery", "face-down"],
    content: {
      en: `MACULAR HOLE

What Is It?
A small break in the macula causing a blind spot or distortion in central vision. Usually caused by age-related vitreous changes pulling on the macula.

Treatment
• Vitrectomy surgery with gas bubble. The bubble acts as a bandage while the hole heals.
• Face-down positioning required for several days to a week after surgery.
• You CANNOT fly until the gas bubble dissolves (2–8 weeks).
• Inform any anesthesiologist about the gas bubble if you need other surgery.

Success Rate
• ~90–95% closure rate. Vision improvement varies — earlier treatment generally gives better results.`,

      es: `AGUJERO MACULAR

¿Qué Es?
Una pequeña ruptura en la mácula que causa un punto ciego o distorsión en la visión central.

Tratamiento
• Cirugía de vitrectomía con burbuja de gas. La burbuja actúa como vendaje mientras el agujero sana.
• Se requiere posición boca abajo por varios días a una semana.
• NO puede volar hasta que la burbuja se disuelva (2–8 semanas).

Tasa de Éxito
• ~90–95% de cierre. La mejoría visual varía — tratamiento temprano da mejores resultados.`,

      vi: `LỖ HOÀNG ĐIỂM

Là Gì?
Vết nứt nhỏ ở hoàng điểm gây điểm mù hoặc méo thị lực trung tâm.

Điều Trị
• Phẫu thuật cắt dịch kính với bong bóng khí. Bong bóng như băng gạc khi lỗ lành.
• Cần tư thế úp mặt vài ngày đến một tuần.
• KHÔNG được bay cho đến khi bong bóng tan (2–8 tuần).

Tỷ Lệ Thành Công
• ~90–95% đóng lỗ. Cải thiện thị lực khác nhau — điều trị sớm cho kết quả tốt hơn.`,

      pt: `BURACO MACULAR

O Que É?
Pequena ruptura na mácula causando ponto cego ou distorção na visão central.

Tratamento
• Cirurgia de vitrectomia com bolha de gás. A bolha age como curativo enquanto o buraco cicatriza.
• Posicionamento face para baixo necessário por vários dias a uma semana.
• NÃO pode voar até a bolha dissolver (2–8 semanas).

Taxa de Sucesso
• ~90–95% de fechamento. Melhora visual varia — tratamento mais cedo geralmente dá melhores resultados.`
    }
  },
  {
    id: "cond-rd",
    category: "condition",
    title: { en: "Retinal Detachment — Warning Signs", es: "Desprendimiento de Retina — Señales de Alarma", vi: "Bong Võng Mạc — Dấu Hiệu Cảnh Báo", pt: "Descolamento de Retina — Sinais de Alerta" },
    tags: ["retinal detachment", "emergency", "flashes", "floaters"],
    content: {
      en: `RETINAL DETACHMENT — WARNING SIGNS

This Is an Eye Emergency. Contact your retina specialist or go to the ER immediately.

Warning Signs
• FLASHES of light (like lightning bolts).
• FLOATERS — sudden increase (shower of dots, cobwebs).
• A SHADOW or CURTAIN across your vision.
• Sudden VISION LOSS.

Do NOT wait. These require same-day evaluation.

Risk Factors
• Previous retinal detachment, high myopia, previous eye surgery, family history, eye trauma.

Treatment
• Surgery is required: pneumatic retinopexy (office), scleral buckle, or vitrectomy.
• The sooner treated, the better the outcome — especially if the macula has not yet detached.`,

      es: `DESPRENDIMIENTO DE RETINA — SEÑALES DE ALARMA

Esto Es una Emergencia Ocular. Contacte a su retinólogo o vaya a urgencias inmediatamente.

Señales de Alarma
• DESTELLOS de luz (como relámpagos).
• MOSCAS VOLANTES — aumento súbito (lluvia de puntos, telarañas).
• Una SOMBRA o CORTINA en su visión.
• PÉRDIDA SÚBITA de visión.

NO espere. Requiere evaluación el mismo día.

Tratamiento
• Se requiere cirugía. Cuanto antes se trate, mejor el resultado.`,

      vi: `BONG VÕNG MẠC — DẤU HIỆU CẢNH BÁO

Đây Là Cấp Cứu Mắt. Liên hệ bác sĩ võng mạc hoặc đến phòng cấp cứu ngay.

Dấu Hiệu Cảnh Báo
• ÁNH SÁNG LÓE (như tia chớp).
• ĐỐM ĐEN — tăng đột ngột (mưa chấm, mạng nhện).
• BÓNG hoặc MÀN CHE trong tầm nhìn.
• MẤT THỊ LỰC đột ngột.

KHÔNG chờ đợi. Cần khám ngay trong ngày.

Điều Trị
• Cần phẫu thuật. Điều trị càng sớm, kết quả càng tốt.`,

      pt: `DESCOLAMENTO DE RETINA — SINAIS DE ALERTA

Isto É uma Emergência Ocular. Contate seu retinólogo ou vá ao pronto-socorro imediatamente.

Sinais de Alerta
• FLASHES de luz (como relâmpagos).
• MOSCAS VOLANTES — aumento súbito (chuva de pontos, teias).
• SOMBRA ou CORTINA na visão.
• PERDA SÚBITA de visão.

NÃO espere. Requer avaliação no mesmo dia.

Tratamento
• Cirurgia é necessária. Quanto mais cedo tratado, melhor o resultado.`
    }
  },
  {
    id: "cond-amsler",
    category: "condition",
    title: { en: "How to Use the Amsler Grid", es: "Cómo Usar la Cuadrícula de Amsler", vi: "Cách Dùng Lưới Amsler", pt: "Como Usar a Grade de Amsler" },
    tags: ["amsler", "monitoring", "AMD", "home test"],
    content: {
      en: `HOW TO USE THE AMSLER GRID

What Is It?
A simple grid chart with a central dot to monitor your central vision at home for changes.

How to Use — Daily
1. Wear your reading glasses.
2. Hold at comfortable reading distance (~12–14 inches).
3. Cover one eye completely.
4. Look at the center dot.
5. Notice if any lines appear wavy, distorted, blurry, or missing.
6. Repeat with the other eye.

If You Notice a Change
• Contact your retina doctor THAT SAME DAY.
• A new distortion could mean your condition is changing and may need treatment.
• Do not wait for your next scheduled appointment.

Tips
• Check at the same time daily (e.g., with morning coffee).
• Always test each eye separately.
• Keep in a convenient place — refrigerator, bathroom mirror, bedside.
• Good lighting is important.`,

      es: `CÓMO USAR LA CUADRÍCULA DE AMSLER

¿Qué Es?
Un gráfico simple con un punto central para monitorear su visión central en casa.

Cómo Usar — Diariamente
1. Use sus lentes de lectura.
2. Sostenga a distancia cómoda de lectura (~30–35 cm).
3. Cubra un ojo completamente.
4. Mire el punto central.
5. Note si alguna línea se ve ondulada, distorsionada, borrosa o faltante.
6. Repita con el otro ojo.

Si Nota un Cambio
• Contacte a su retinólogo ESE MISMO DÍA.
• No espere a su próxima cita programada.`,

      vi: `CÁCH DÙNG LƯỚI AMSLER

Là Gì?
Biểu đồ lưới đơn giản với chấm trung tâm để theo dõi thị lực trung tâm tại nhà.

Cách Dùng — Hàng Ngày
1. Đeo kính đọc sách.
2. Cầm ở khoảng cách đọc thoải mái (~30–35 cm).
3. Che hoàn toàn một mắt.
4. Nhìn vào chấm trung tâm.
5. Chú ý nếu đường nào trông lượn sóng, méo, mờ hoặc thiếu.
6. Lặp lại với mắt kia.

Nếu Thấy Thay Đổi
• Liên hệ bác sĩ võng mạc NGAY TRONG NGÀY.
• Không đợi đến lịch hẹn tiếp.`,

      pt: `COMO USAR A GRADE DE AMSLER

O Que É?
Gráfico simples com ponto central para monitorar visão central em casa.

Como Usar — Diariamente
1. Use seus óculos de leitura.
2. Segure em distância confortável de leitura (~30–35 cm).
3. Cubra um olho completamente.
4. Olhe para o ponto central.
5. Note se alguma linha parece ondulada, distorcida, embaçada ou ausente.
6. Repita com o outro olho.

Se Notar Mudança
• Contate seu retinólogo NO MESMO DIA.
• Não espere pela próxima consulta agendada.`
    }
  },
];

// ── Print helper ───────────────────────────────────────────────────
function printHandout(handout, lang) {
  const content = handout.content[lang] || handout.content.en;
  const title = handout.title[lang] || handout.title.en;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; font-size: 13pt; }
  h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 20px; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 13pt; line-height: 1.7; }
  @media print { body { margin: 0.5in; } }
</style></head><body>
<pre>${content}</pre>
<script>window.print();<\/script>
</body></html>`);
  win.document.close();
}

// ── Component ──────────────────────────────────────────────────────
export default function PatientEducation({ onBack }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState("en");
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return HANDOUTS.filter((h) => {
      if (category !== "all" && h.category !== category) return false;
      if (!q) return true;
      const title = h.title[lang] || h.title.en;
      const content = h.content[lang] || h.content.en;
      return (
        title.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q)) ||
        content.toLowerCase().includes(q)
      );
    });
  }, [search, category, lang]);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Patient Education Library</span>
        {/* Language toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              style={{
                background: lang === l.id ? S.green : "transparent",
                color: lang === l.id ? "#000" : S.muted,
                border: `1px solid ${lang === l.id ? S.green : S.border}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: "0.7rem",
                fontFamily: S.mono,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 20px 0" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search handouts... (e.g. AMD, injection, diabetic, floaters)"
          style={{ display: "block", width: "100%", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 16px", color: S.text, fontFamily: S.font, fontSize: "0.88rem", boxSizing: "border-box", marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                background: category === cat.id ? S.accent : "transparent",
                color: category === cat.id ? "#fff" : S.muted,
                border: `1px solid ${category === cat.id ? S.accent : S.border}`,
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: "0.76rem",
                fontFamily: S.mono,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cat.label}
            </button>
          ))}
          <span style={{ fontSize: "0.72rem", color: S.muted, fontFamily: S.mono, marginLeft: "auto" }}>{filtered.length} handout{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Handout list */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 48px" }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: S.muted, fontSize: "0.88rem" }}>
            No handouts match your search.
          </div>
        )}
        {filtered.map((h) => {
          const isOpen = expanded === h.id;
          const title = h.title[lang] || h.title.en;
          const content = h.content[lang] || h.content.en;
          return (
            <div key={h.id} style={{ background: S.card, border: `1px solid ${isOpen ? S.accent : S.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Title row */}
              <button
                onClick={() => setExpanded(isOpen ? null : h.id)}
                style={{ width: "100%", background: "none", border: "none", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: "0.72rem", fontFamily: S.mono, color: S.amber, fontWeight: 700, textTransform: "uppercase", minWidth: 75 }}>
                  {h.category === "injection" ? "Injection" : h.category === "procedure" ? "Procedure" : "Condition"}
                </span>
                <span style={{ fontSize: "0.88rem", color: S.bright, fontFamily: S.font, fontWeight: 600, flex: 1 }}>{title}</span>
                <span style={{ color: S.muted, fontSize: "0.8rem", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>&#9660;</span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: "0 18px 16px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {h.tags.map((t) => (
                      <span key={t} style={{ background: "#312e81", color: S.accentLight, padding: "2px 8px", borderRadius: 20, fontSize: "0.62rem", fontFamily: S.mono, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: S.font, fontSize: "0.82rem", color: S.text, lineHeight: 1.65, margin: 0, maxHeight: 500, overflowY: "auto", paddingRight: 8 }}>
                    {content}
                  </pre>
                  <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => printHandout(h, lang)}
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.8rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                    >
                      Print Handout
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
