import { useState, useMemo } from "react";
import DropSchedule from "./DropSchedule.jsx";

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
export const HANDOUTS = [
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
3. The injection is given through the white part of the eye (sclera).
4. The entire process takes about 5–10 minutes.

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
3. La inyección se aplica a través de la parte blanca del ojo (esclera).
4. Todo el proceso toma aproximadamente 5–10 minutos.

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
3. Mũi tiêm được thực hiện qua phần trắng của mắt (củng mạc).
4. Toàn bộ quá trình mất khoảng 5–10 phút.

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
3. A injeção é aplicada através da parte branca do olho (esclera).
4. Todo o processo leva cerca de 5–10 minutos.

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
      en: `INSTRUCTIONS AFTER INTRAVITREAL INJECTIONS

1. Soon after the intravitreal injection, the eye may feel scratchy and irritated. As the day goes on, you may also notice burning and tearing. Over-the-counter artificial tears may be applied hourly for the first day to restore moisture to the eye's surface.

2. Make sure hands are clean prior to touching your eye. No swimming (in pools, hot tubs, and/or lakes) for 3 days. Make sure no water gets into the eye while showering. Refrain from rubbing the eye for 72 hours.

3. Do not wear contact lenses for 3 days after the injection.

4. Usually after a night's sleep, by the next morning, the eye feels 60–70% better. As the day continues, the eye should continue to feel better. On the second day after the injection, the eye should feel almost back to normal.

5. A hemorrhage on the white of the eye is possible but uncommon. Although you may find it cosmetically displeasing, it will resolve on its own and is benign.

6. It is normal to see new floaters or small bubbles after the injection. They usually resolve within 24–48 hours.

7. You should continue any other eye drops you are using regularly unless otherwise instructed by the doctor.

8. Use artificial tears or lubricant eye ointment as needed for pain and irritation.

When to Call Right Away
Call us immediately if you experience any of the following — especially in the days following the injection:
• Decreased, blurred, or worsening vision.
• Severe eye pain, worsening eye pain, or pain above the brow.
• White or yellow pus or discharge from the eye.
• Swollen or puffy eyelid(s), or increasing redness around the eye.
• A new shadow or curtain across your vision.
• A sudden increase in flashes, or new floaters that do not resolve within 48 hours.`,

      es: `INSTRUCCIONES DESPUÉS DE INYECCIONES INTRAVÍTREAS

1. Poco después de la inyección intravítrea, el ojo puede sentirse rasposo e irritado. A lo largo del día, también puede notar ardor y lagrimeo. Se pueden aplicar lágrimas artificiales de venta libre cada hora durante el primer día para restaurar la humedad en la superficie del ojo.

2. Asegúrese de que sus manos estén limpias antes de tocar el ojo. No nadar (en piscinas, jacuzzis ni lagos) durante 3 días. Asegúrese de que no entre agua en el ojo mientras se ducha. No se frote el ojo durante 72 horas.

3. No use lentes de contacto durante 3 días después de la inyección.

4. Generalmente después de una noche de sueño, a la mañana siguiente el ojo se siente un 60–70% mejor. A medida que el día continúa, el ojo debe seguir mejorando. Al segundo día después de la inyección, el ojo debería sentirse casi normal.

5. Una hemorragia en la parte blanca del ojo es posible pero poco común. Aunque pueda encontrarla estéticamente desagradable, se resolverá por sí sola y es benigna.

6. Es normal ver nuevas moscas volantes o pequeñas burbujas después de la inyección. Generalmente desaparecen en 24–48 horas.

7. Debe continuar con cualquier otra gota oftálmica que use regularmente, a menos que el médico indique lo contrario.

8. Use lágrimas artificiales o ungüento lubricante ocular según sea necesario para el dolor e irritación.

Llame Inmediatamente
Llame al consultorio inmediatamente si experimenta cualquiera de los siguientes — especialmente en los días después de la inyección:
• Disminución, visión borrosa o empeoramiento de la visión.
• Dolor ocular severo, dolor que empeora, o dolor encima de la ceja.
• Pus blanco o amarillo o secreción del ojo.
• Párpado(s) hinchado(s) o enrojecimiento creciente alrededor del ojo.
• Una sombra o cortina nueva en su visión.
• Un aumento súbito de destellos, o nuevas moscas volantes que no se resuelven en 48 horas.`,

      vi: `HƯỚNG DẪN SAU TIÊM NỘI NHÃN

1. Ngay sau khi tiêm nội nhãn, mắt có thể cảm thấy cộm và kích ứng. Trong ngày, bạn cũng có thể thấy nóng rát và chảy nước mắt. Nước mắt nhân tạo không kê đơn có thể nhỏ mỗi giờ trong ngày đầu tiên để phục hồi độ ẩm cho bề mặt mắt.

2. Đảm bảo tay sạch trước khi chạm vào mắt. Không bơi (ở hồ bơi, bồn nước nóng, và/hoặc hồ) trong 3 ngày. Đảm bảo không để nước vào mắt khi tắm. Không dụi mắt trong 72 giờ.

3. Không đeo kính áp tròng trong 3 ngày sau tiêm.

4. Thường sau một đêm ngủ, đến sáng hôm sau, mắt cảm thấy tốt hơn 60–70%. Khi ngày tiếp tục, mắt sẽ tiếp tục cải thiện. Vào ngày thứ hai sau tiêm, mắt sẽ gần như trở lại bình thường.

5. Xuất huyết trên phần trắng của mắt có thể xảy ra nhưng không phổ biến. Dù có thể không đẹp mắt, nó sẽ tự hết và là lành tính.

6. Bình thường khi thấy đốm đen mới hoặc bóng nhỏ sau tiêm. Chúng thường biến mất sau 24–48 giờ.

7. Bạn nên tiếp tục bất kỳ thuốc nhỏ mắt nào đang dùng thường xuyên trừ khi bác sĩ chỉ dẫn khác.

8. Dùng nước mắt nhân tạo hoặc thuốc mỡ bôi trơn mắt khi cần cho đau và kích ứng.

Gọi Ngay
Gọi cho chúng tôi ngay nếu bạn gặp bất kỳ điều nào sau đây — đặc biệt trong những ngày sau tiêm:
• Giảm, mờ hoặc xấu đi thị lực.
• Đau mắt nặng, đau tăng dần, hoặc đau trên lông mày.
• Mủ trắng hoặc vàng hoặc dịch tiết từ mắt.
• Mí mắt sưng hoặc đỏ tăng quanh mắt.
• Bóng hoặc màn che mới trong tầm nhìn.
• Đột ngột tăng lóe sáng, hoặc đốm đen mới không hết sau 48 giờ.`,

      pt: `INSTRUÇÕES APÓS INJEÇÕES INTRAVÍTREAS

1. Logo após a injeção intravítrea, o olho pode ficar áspero e irritado. Ao longo do dia, você também pode notar ardor e lacrimejamento. Lágrimas artificiais de venda livre podem ser aplicadas a cada hora no primeiro dia para restaurar a umidade na superfície do olho.

2. Certifique-se de que as mãos estejam limpas antes de tocar o olho. Não nadar (em piscinas, banheiras de hidromassagem e/ou lagos) por 3 dias. Certifique-se de que a água não entre no olho durante o banho. Não esfregue o olho por 72 horas.

3. Não use lentes de contato por 3 dias após a injeção.

4. Geralmente após uma noite de sono, na manhã seguinte o olho se sente 60–70% melhor. À medida que o dia continua, o olho deve continuar melhorando. No segundo dia após a injeção, o olho deve se sentir quase normal.

5. Uma hemorragia na parte branca do olho é possível, mas incomum. Embora possa ser esteticamente desagradável, ela se resolverá sozinha e é benigna.

6. É normal ver novas moscas volantes ou pequenas bolhas após a injeção. Geralmente desaparecem em 24–48 horas.

7. Você deve continuar qualquer outro colírio que esteja usando regularmente, a menos que o médico instrua o contrário.

8. Use lágrimas artificiais ou pomada lubrificante ocular conforme necessário para dor e irritação.

Ligue Imediatamente
Ligue-nos imediatamente se você experimentar qualquer um dos seguintes — especialmente nos dias após a injeção:
• Diminuição, visão borrada ou piora da visão.
• Dor ocular severa, dor que piora, ou dor acima da sobrancelha.
• Pus branco ou amarelo ou secreção do olho.
• Pálpebra(s) inchada(s) ou aumento de vermelhidão ao redor do olho.
• Uma sombra ou cortina nova em sua visão.
• Aumento súbito de flashes, ou novas moscas volantes que não resolvem em 48 horas.`
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
    id: "proc-retinal-laser",
    category: "procedure",
    title: { en: "Retinal Laser", es: "Láser Retiniano", vi: "Laser Võng Mạc", pt: "Laser Retiniano" },
    tags: ["laser", "PRP", "retinopexy", "tear", "hole"],
    content: {
      en: `RETINAL LASER

What Is It?
Retinal laser is an in-office procedure that uses a precise beam of light to treat the retina. It is used to seal retinal tears or holes (laser retinopexy) and to treat abnormal blood vessels in conditions like diabetic retinopathy or vein occlusion (PRP — panretinal photocoagulation).

How It Is Done
• Eye drops dilate the pupil and numb the eye.
• Your doctor may use a contact lens gently placed on the eye, or perform the laser through a lens held in front of the eye (no contact). The choice depends on the location and type of treatment.
• The laser delivers many small flashes of light to targeted areas of the retina.

During the Procedure
• The laser may hurt — patients often describe brief, sharp sensations. The pain typically goes away as soon as the laser is completed.
• The bright lights can occasionally trigger a migraine in patients prone to them.
• It is important to look exactly where your doctor tells you to look. DO NOT look directly at the laser — this protects your central vision.

Right After the Laser
• The laser lights are very bright. For a few moments after the laser is completed, you may feel like you cannot see anything — this is normal.
• Your vision returns gradually, sometimes with color hues (pink, purple). The hues will fade slowly.
• The laser does NOT eliminate floaters. If you had floaters before, they will still be there afterward.
• Mild redness or eye discomfort for a day or two is normal.

After the Procedure
• You may resume normal activities. Do not drive the day of the laser if your vision is still blurry from the dilation drops.
• Continue any other eye drops you have been prescribed.

When to Call Right Away
Call us immediately if you experience any of the following:
• A new shadow or curtain across your vision.
• A sudden increase in new floaters or flashes of light.
• Severe or worsening eye pain.
• A significant decrease in vision after the initial return.`,

      es: `LÁSER RETINIANO

¿Qué Es?
El láser retiniano es un procedimiento en consultorio que usa luz precisa para tratar la retina. Se usa para sellar desgarros o agujeros retinianos (retinopexia con láser) y para tratar vasos sanguíneos anormales en retinopatía diabética u oclusión venosa (PRP — fotocoagulación panretiniana).

Cómo Se Realiza
• Las gotas dilatan la pupila y adormecen el ojo.
• Su médico puede usar un lente de contacto en el ojo, o usar un lente sostenido frente al ojo (sin contacto), según la ubicación del tratamiento.
• El láser administra pequeños destellos de luz a áreas específicas de la retina.

Durante el Procedimiento
• El láser puede doler — los pacientes a menudo describen sensaciones breves y agudas. El dolor generalmente desaparece tan pronto como el láser termina.
• Las luces brillantes ocasionalmente pueden desencadenar una migraña en pacientes propensos.
• Es importante mirar exactamente donde su médico le diga. NO mire directamente al láser — esto protege su visión central.

Justo Después del Láser
• Las luces del láser son muy brillantes. Por unos momentos después puede sentir que no ve nada — esto es normal. La visión regresa gradualmente, a veces con tonos de color (rosado, púrpura) que se desvanecerán lentamente.
• El láser NO elimina las moscas volantes existentes. Enrojecimiento leve o molestia ocular por un día o dos es normal.

Después del Procedimiento
• Puede reanudar sus actividades normales. No conduzca el día del láser si su visión sigue borrosa por las gotas de dilatación.
• Continúe cualquier otra gota oftálmica que le hayan recetado.

Llame Inmediatamente
Llame al consultorio inmediatamente si experimenta cualquiera de los siguientes:
• Una sombra o cortina nueva en su visión.
• Un aumento súbito de nuevas moscas volantes o destellos de luz.
• Dolor ocular severo o que empeora.
• Una disminución significativa de la visión después del retorno inicial.`,

      vi: `LASER VÕNG MẠC

Đây Là Gì?
Laser võng mạc là một thủ thuật tại phòng khám sử dụng chùm tia sáng chính xác để điều trị võng mạc. Được dùng để niêm phong vết rách hoặc lỗ võng mạc (laser hàn võng mạc) và để điều trị các mạch máu bất thường trong các tình trạng như bệnh võng mạc tiểu đường hoặc tắc tĩnh mạch (PRP — laser quang đông toàn võng mạc).

Cách Thực Hiện
• Thuốc nhỏ mắt làm giãn đồng tử và gây tê mắt.
• Bác sĩ có thể dùng thấu kính tiếp xúc nhẹ đặt trên mắt, hoặc thực hiện laser qua thấu kính giữ trước mắt (không tiếp xúc). Lựa chọn phụ thuộc vào vị trí và loại điều trị.
• Laser phát ra nhiều tia sáng nhỏ đến các khu vực mục tiêu của võng mạc.

Trong Khi Thực Hiện
• Laser có thể đau — bệnh nhân thường mô tả cảm giác ngắn, sắc. Cơn đau thường biến mất ngay khi laser kết thúc.
• Ánh sáng chói có thể đôi khi kích hoạt cơn đau nửa đầu ở những người dễ bị.
• Quan trọng là nhìn chính xác nơi bác sĩ chỉ dẫn. KHÔNG nhìn thẳng vào laser — điều này bảo vệ thị lực trung tâm.

Ngay Sau Laser
• Ánh sáng laser rất chói. Trong vài giây sau khi laser kết thúc, bạn có thể cảm thấy như không nhìn thấy gì — điều này bình thường.
• Thị lực trở lại dần dần, đôi khi với sắc màu (hồng, tím). Các sắc màu sẽ phai dần.
• Laser KHÔNG loại bỏ đốm đen. Nếu trước đây có đốm đen, sau laser vẫn còn.
• Đỏ nhẹ hoặc khó chịu trong mắt từ một đến hai ngày là bình thường.

Sau Thủ Thuật
• Có thể tiếp tục hoạt động bình thường. Không lái xe vào ngày làm laser nếu thị lực còn mờ do thuốc giãn đồng tử.
• Tiếp tục các loại thuốc nhỏ mắt khác đã được kê đơn.

Gọi Ngay
Gọi cho chúng tôi ngay nếu bạn gặp bất kỳ điều nào sau đây:
• Bóng hoặc màn che mới trong tầm nhìn.
• Đột ngột tăng đốm đen hoặc lóe sáng mới.
• Đau mắt nặng hoặc tăng dần.
• Giảm thị lực đáng kể sau khi đã trở lại bình thường.`,

      pt: `LASER RETINIANO

O Que É?
O laser retiniano é um procedimento ambulatorial que usa luz precisa para tratar a retina. É usado para selar rasgos ou buracos retinianos (retinopexia a laser) e para tratar vasos sanguíneos anormais em retinopatia diabética ou oclusão venosa (PRP — fotocoagulação panretiniana).

Como É Realizado
• Colírios dilatam a pupila e anestesiam o olho.
• Seu médico pode usar uma lente de contato no olho, ou uma lente segurada na frente do olho (sem contato), conforme a localização do tratamento.
• O laser entrega pequenos flashes de luz a áreas específicas da retina.

Durante o Procedimento
• O laser pode doer — pacientes frequentemente descrevem sensações breves e agudas. A dor geralmente desaparece assim que o laser termina.
• As luzes brilhantes ocasionalmente podem desencadear uma enxaqueca em pacientes propensos.
• É importante olhar exatamente onde seu médico disser. NÃO olhe diretamente para o laser — isso protege sua visão central.

Logo Após o Laser
• As luzes do laser são muito brilhantes. Por alguns momentos depois você pode sentir que não consegue ver nada — isso é normal. A visão retorna gradualmente, às vezes com tons de cor (rosa, roxo) que desaparecerão lentamente.
• O laser NÃO elimina moscas volantes existentes. Vermelhidão leve ou desconforto ocular por um ou dois dias é normal.

Após o Procedimento
• Pode retomar suas atividades normais. Não dirija no dia do laser se sua visão ainda estiver embaçada pelas gotas de dilatação.
• Continue qualquer outro colírio que tenha sido prescrito.

Ligue Imediatamente
Ligue-nos imediatamente se você experimentar qualquer um dos seguintes:
• Uma sombra ou cortina nova em sua visão.
• Um aumento súbito de novas moscas volantes ou flashes de luz.
• Dor ocular severa ou que piora.
• Uma diminuição significativa da visão após o retorno inicial.`
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

[IMAGE:scleral-buckle|Figure 1: A silicone band (scleral buckle) is sewn around the outside of the eye to support a detached retina.]

What Is a Scleral Buckle?
A scleral buckle is surgery to repair a retinal detachment. A soft silicone band is sewn around the outside of the eye, gently indenting the eye wall inward to bring it into contact with the detached retina. The band stays in place permanently — it is not visible from the outside and you will not feel it once you have healed.

When Is It Used?
• For retinal detachments caused by retinal tears, especially in younger patients or those who have not had cataract surgery.
• May be used alone or together with vitrectomy, laser, or cryotherapy.

What to Expect
• Performed in the operating room under local or general anesthesia.
• Surgery takes approximately 1–2 hours.
• Nothing to eat or drink after midnight before surgery.
• You will need someone to drive you home and stay with you overnight.
• Cryotherapy (freezing) is usually applied to seal the retinal tear during surgery.

After Surgery
• Eye patch for about 1 day.
• Use the prescribed antibiotic and anti-inflammatory eye drops as directed.
• Mild discomfort, redness, and tearing are normal for the first 1–2 weeks.
• Avoid heavy lifting, straining, or bending at the waist for 2 weeks.
• Vision improvement is gradual and may take weeks to months.

Risks of Surgery
Like any surgery, scleral buckle surgery has some risks:
• Double vision (usually temporary).
• Vision loss.
• Need for additional surgery if the retina does not fully reattach or if a new tear forms.
• Bleeding.
• Infection (rare but serious — see warnings below).
• Change in your glasses prescription, since the band slightly changes the shape of the eye (often makes the eye more nearsighted).

When to Call Right Away
Call us immediately if you experience any of the following:
• Severe or worsening eye pain not relieved by medication.
• Significant decrease in vision.
• Pus, yellow or thick discharge, or increasing redness/swelling around the eye.
• Sudden increase in flashes, new floaters, or a shadow or curtain across your vision.`,

      es: `CIRUGÍA DE CERCLAJE ESCLERAL

[IMAGE:scleral-buckle|Figura 1: Una banda de silicón (cerclaje escleral) se cose alrededor del exterior del ojo para apoyar una retina desprendida.]

¿Qué Es el Cerclaje Escleral?
Es una cirugía para reparar un desprendimiento de retina. Se cose una banda blanda de silicón alrededor del exterior del ojo, indentando suavemente la pared del ojo hacia adentro para que entre en contacto con la retina desprendida. La banda queda permanentemente — no es visible desde el exterior y no la sentirá una vez cicatrizado.

¿Cuándo Se Usa?
• Para desprendimientos de retina causados por desgarros, especialmente en pacientes jóvenes o que no han tenido cirugía de catarata.
• Puede usarse sola o junto con vitrectomía, láser o crioterapia.

Qué Esperar
• Se realiza en el quirófano bajo anestesia local o general.
• La cirugía toma aproximadamente 1–2 horas.
• Nada de comer o beber después de medianoche antes de la cirugía.
• Necesitará a alguien que lo lleve a casa y se quede con usted esa noche.
• Usualmente se aplica crioterapia (congelación) para sellar el desgarro retiniano durante la cirugía.

Después de la Cirugía
• Parche ocular por aproximadamente 1 día.
• Use las gotas antibióticas y antiinflamatorias recetadas según indicación.
• Molestia leve, enrojecimiento y lagrimeo son normales las primeras 1–2 semanas.
• Evite levantar peso, esforzarse o agacharse por 2 semanas.
• La mejoría visual es gradual y puede tomar semanas a meses.

Riesgos de la Cirugía
Como cualquier cirugía, el cerclaje escleral tiene algunos riesgos:
• Visión doble (usualmente temporal).
• Pérdida de visión.
• Necesidad de cirugía adicional si la retina no se vuelve a adherir completamente o si se forma un nuevo desgarro.
• Sangrado.
• Infección (rara pero seria — ver advertencias abajo).
• Cambio en su receta de lentes, ya que la banda cambia ligeramente la forma del ojo (a menudo lo vuelve más miope).

Llame Inmediatamente
Llame al consultorio inmediatamente si experimenta cualquiera de los siguientes:
• Dolor ocular severo o que empeora, no aliviado por medicación.
• Disminución significativa de la visión.
• Pus, secreción amarilla o espesa, o aumento de enrojecimiento/hinchazón alrededor del ojo.
• Aumento súbito de destellos, nuevas moscas volantes, o una sombra o cortina en su visión.`,

      vi: `PHẪU THUẬT ĐAI CỦNG MẠC

[IMAGE:scleral-buckle|Hình 1: Một dải silicon (đai củng mạc) được khâu quanh bên ngoài mắt để nâng đỡ võng mạc bị bong.]

Đai Củng Mạc Là Gì?
Đây là phẫu thuật để sửa chữa bong võng mạc. Một dải silicon mềm được khâu quanh bên ngoài mắt, ấn nhẹ thành mắt vào trong để tiếp xúc với võng mạc bị bong. Dải này nằm vĩnh viễn — không nhìn thấy từ bên ngoài và bạn sẽ không cảm nhận được sau khi lành.

Khi Nào Sử Dụng?
• Cho bong võng mạc do rách võng mạc, đặc biệt ở bệnh nhân trẻ hoặc chưa phẫu thuật đục thủy tinh thể.
• Có thể dùng đơn lẻ hoặc kết hợp với cắt dịch kính, laser, hoặc đông lạnh.

Những Gì Cần Biết
• Thực hiện trong phòng mổ với gây tê tại chỗ hoặc gây mê toàn thân.
• Phẫu thuật mất khoảng 1–2 giờ.
• Không ăn uống sau nửa đêm trước phẫu thuật.
• Bạn cần người đưa bạn về và ở lại qua đêm.
• Đông lạnh (cryotherapy) thường được áp dụng để niêm phong vết rách trong phẫu thuật.

Sau Phẫu Thuật
• Đeo miếng che mắt khoảng 1 ngày.
• Dùng thuốc nhỏ mắt kháng sinh và kháng viêm theo chỉ dẫn.
• Khó chịu nhẹ, đỏ và chảy nước mắt là bình thường trong 1–2 tuần đầu.
• Tránh nâng vật nặng, gắng sức, hoặc cúi người trong 2 tuần.
• Cải thiện thị lực diễn ra dần dần và có thể mất vài tuần đến vài tháng.

Rủi Ro Phẫu Thuật
Như mọi phẫu thuật, đai củng mạc có một số rủi ro:
• Nhìn đôi (thường tạm thời).
• Mất thị lực.
• Cần phẫu thuật thêm nếu võng mạc không gắn lại hoàn toàn hoặc nếu hình thành vết rách mới.
• Chảy máu.
• Nhiễm trùng (hiếm nhưng nghiêm trọng — xem cảnh báo bên dưới).
• Thay đổi đơn kính, vì dải này làm thay đổi nhẹ hình dạng mắt (thường làm mắt cận thị hơn).

Gọi Ngay
Gọi cho chúng tôi ngay nếu bạn gặp bất kỳ điều nào sau đây:
• Đau mắt nặng hoặc tăng dần, không giảm với thuốc.
• Giảm thị lực đáng kể.
• Mủ, dịch tiết vàng hoặc đặc, hoặc tăng đỏ/sưng quanh mắt.
• Đột ngột tăng lóe sáng, đốm đen mới, hoặc bóng/màn che trong tầm nhìn.`,

      pt: `CIRURGIA DE INTROFLEXÃO ESCLERAL

[IMAGE:scleral-buckle|Figura 1: Uma faixa de silicone (introflexão escleral) é suturada ao redor do exterior do olho para apoiar uma retina descolada.]

O Que É a Introflexão Escleral?
É uma cirurgia para reparar um descolamento de retina. Uma faixa macia de silicone é suturada ao redor do exterior do olho, indentando suavemente a parede do olho para dentro para contatar a retina descolada. A faixa fica permanentemente — não é visível por fora e você não sentirá depois de cicatrizado.

Quando É Usada?
• Para descolamentos de retina causados por rasgos, especialmente em pacientes jovens ou que não fizeram cirurgia de catarata.
• Pode ser usada sozinha ou junto com vitrectomia, laser ou crioterapia.

O Que Esperar
• Realizada no centro cirúrgico sob anestesia local ou geral.
• A cirurgia leva aproximadamente 1–2 horas.
• Nada para comer ou beber após meia-noite antes da cirurgia.
• Você precisará de alguém para levá-lo para casa e ficar com você durante a noite.
• Crioterapia (congelamento) geralmente é aplicada para selar o rasgo retiniano durante a cirurgia.

Após a Cirurgia
• Tampão ocular por cerca de 1 dia.
• Use os colírios antibióticos e anti-inflamatórios prescritos conforme orientação.
• Desconforto leve, vermelhidão e lacrimejamento são normais nas primeiras 1–2 semanas.
• Evite levantar peso, fazer esforço, ou curvar-se por 2 semanas.
• A melhora visual é gradual e pode levar semanas a meses.

Riscos da Cirurgia
Como qualquer cirurgia, a introflexão escleral tem alguns riscos:
• Visão dupla (geralmente temporária).
• Perda de visão.
• Necessidade de cirurgia adicional se a retina não readerir completamente ou se um novo rasgo se formar.
• Sangramento.
• Infecção (rara mas séria — veja avisos abaixo).
• Mudança em sua prescrição de óculos, já que a faixa muda ligeiramente a forma do olho (geralmente torna o olho mais míope).

Ligue Imediatamente
Ligue-nos imediatamente se você experimentar qualquer um dos seguintes:
• Dor ocular severa ou que piora, não aliviada por medicação.
• Diminuição significativa da visão.
• Pus, secreção amarela ou espessa, ou aumento de vermelhidão/inchaço ao redor do olho.
• Aumento súbito de flashes, novas moscas volantes, ou uma sombra ou cortina em sua visão.`
    }
  },

  {
    id: "proc-pneumatic-post",
    category: "procedure",
    title: { en: "After Your Pneumatic Retinopexy", es: "Después de su Retinopexia Neumática", vi: "Sau Bơm Khí Võng Mạc", pt: "Após sua Retinopexia Pneumática" },
    tags: ["pneumatic retinopexy", "post-op", "positioning", "gas bubble"],
    content: {
      en: `AFTER YOUR PNEUMATIC RETINOPEXY

What Just Happened?
You had a pneumatic retinopexy. A gas bubble (SF6) was injected into your eye to push your detached retina back against the eye wall. The bubble will press on the retinal tear over the next 4 days.

Positioning — The Most Important Part
The success of this procedure depends on positioning. Maintain the position your doctor specified for 4 days. If you do not, the procedure may fail and the retina can re-detach.
• Brief breaks are OK for eating, using the restroom, and showering — otherwise stay in position.
• Vision in the operated eye will be impaired and depth perception may be off. Take care on stairs and have someone with you when you walk.

Tomorrow's Follow-Up
Return tomorrow for laser retinopexy or cryotherapy to permanently seal the retinal tear. This step is essential — without it, the retina can detach again.

Eye Drops
• Ofloxacin (Ocuflox) antibiotic drops, 4 times per day for 4 days.
• Continue any other eye drops you have been prescribed.

Gas Bubble (SF6) — Lasts About 2 Weeks
• Do NOT fly, travel to high altitudes, or scuba dive until the bubble is gone. Altitude changes can cause dangerous pressure rises inside the eye.
• Wear the green bracelet at all times — it alerts other healthcare providers to the gas bubble. Tell any other doctor before any surgery.

Activity Restrictions
• No heavy lifting (over 5–10 lbs), swimming, or submerging the eye for 1 week.
• Do not rub the eye. Do not drive while vision is impaired.

When to Call Right Away
Contact your eye doctor immediately if you experience:
• Sudden or significant decrease in vision.
• Severe or worsening eye pain.
• Pus, yellow or thick discharge, or increasing redness/swelling (signs of infection — endophthalmitis).
• A new shadow or curtain, or sudden increase in floaters or flashes (signs of worsening detachment).`,

      es: `DESPUÉS DE SU RETINOPEXIA NEUMÁTICA

¿Qué Pasó?
Tuvo una retinopexia neumática. Se inyectó una burbuja de gas (SF6) en su ojo para empujar la retina desprendida contra la pared del ojo. La burbuja presionará contra el desgarro retiniano durante los próximos 4 días.

Posicionamiento — La Parte Más Importante
El éxito depende del posicionamiento. Mantenga la posición indicada durante 4 días. Si no la mantiene, la retina puede volver a desprenderse.
• Pausas breves para comer, baño y ducharse — por lo demás, mantenga la posición.
• La visión y la percepción de profundidad estarán afectadas. Tenga cuidado en escaleras y al caminar.

Seguimiento Mañana
Regrese mañana para láser o crioterapia para sellar permanentemente el desgarro. Sin este paso, la retina puede volver a desprenderse.

Gotas Oftálmicas
• Gotas antibióticas de Ofloxacino (Ocuflox), 4 veces al día durante 4 días.
• Continúe con cualquier otra gota que le hayan recetado.

Burbuja de Gas (SF6) — Dura Unas 2 Semanas
• NO vuele, no viaje a altitudes elevadas, ni bucee hasta que la burbuja desaparezca. Los cambios de altitud pueden causar aumentos peligrosos de presión dentro del ojo.
• Use el brazalete verde en todo momento — alerta a otros proveedores de salud sobre la burbuja. Informe a cualquier otro médico antes de cualquier cirugía.

Restricciones de Actividad
• No levante objetos pesados (más de 5–10 lbs), no nade ni sumerja el ojo durante 1 semana.
• No se frote el ojo. No conduzca mientras la visión esté afectada.

Llame Inmediatamente
Contacte a su oftalmólogo inmediatamente si experimenta:
• Disminución súbita o significativa de la visión.
• Dolor ocular severo o que empeora.
• Pus, secreción amarilla o espesa, o aumento de enrojecimiento/hinchazón (signos de infección — endoftalmitis).
• Una nueva sombra o cortina, o aumento súbito de moscas volantes o destellos (signos de empeoramiento del desprendimiento).`,

      vi: `SAU BƠM KHÍ VÕNG MẠC

Điều Gì Vừa Xảy Ra?
Bạn đã được bơm khí võng mạc. Một bóng khí (SF6) đã được tiêm vào mắt để đẩy võng mạc bị bong trở lại thành mắt. Bóng khí sẽ ép vào vết rách võng mạc trong 4 ngày tiếp theo.

Tư Thế — Phần Quan Trọng Nhất
Sự thành công của thủ thuật này phụ thuộc vào tư thế. Giữ tư thế bác sĩ chỉ định trong 4 ngày. Nếu bạn không giữ, thủ thuật có thể thất bại và võng mạc có thể bong lại.
• Nghỉ ngắn được phép để ăn, đi vệ sinh và tắm — ngoài ra hãy giữ tư thế.
• Thị lực ở mắt phẫu thuật sẽ bị suy giảm và cảm nhận chiều sâu có thể bị ảnh hưởng. Cẩn thận khi lên xuống cầu thang và nhờ người đi cùng khi đi.

Tái Khám Ngày Mai
Quay lại ngày mai để laser hàn võng mạc hoặc đông lạnh để niêm phong vĩnh viễn vết rách. Bước này rất cần thiết — nếu không, võng mạc có thể bong lại.

Thuốc Nhỏ Mắt
• Thuốc nhỏ kháng sinh Ofloxacin (Ocuflox), 4 lần mỗi ngày trong 4 ngày.
• Tiếp tục các loại thuốc nhỏ mắt khác đã được kê đơn.

Bóng Khí (SF6) — Kéo Dài Khoảng 2 Tuần
• KHÔNG đi máy bay, lên núi cao, hay lặn cho đến khi bóng khí biến mất. Thay đổi độ cao có thể làm áp suất trong mắt tăng nguy hiểm.
• Đeo vòng tay màu xanh lá cây mọi lúc — cảnh báo các bác sĩ khác về bóng khí. Báo cho bất kỳ bác sĩ nào trước khi làm phẫu thuật khác.

Hạn Chế Hoạt Động
• Không nâng vật nặng (trên 5–10 lbs), bơi, hoặc ngâm mắt trong 1 tuần.
• Không dụi mắt. Không lái xe khi thị lực bị suy giảm.

Gọi Ngay
Liên hệ bác sĩ mắt ngay nếu bạn gặp:
• Giảm thị lực đột ngột hoặc đáng kể.
• Đau mắt nặng hoặc tăng dần.
• Mủ, dịch tiết vàng/đặc, hoặc tăng đỏ/sưng (dấu hiệu nhiễm trùng — viêm nội nhãn).
• Bóng hoặc màn che mới, hoặc đột ngột tăng đốm đen/lóe sáng (dấu hiệu bong võng mạc đang xấu đi).`,

      pt: `APÓS SUA RETINOPEXIA PNEUMÁTICA

O Que Aconteceu?
Você fez uma retinopexia pneumática. Uma bolha de gás (SF6) foi injetada para empurrar a retina contra a parede do olho. A bolha pressionará o rasgo durante os próximos 4 dias.

Posicionamento — A Parte Mais Importante
O sucesso depende do posicionamento. Mantenha a posição especificada por 4 dias. Se não mantiver, a retina pode descolar novamente.
• Pausas breves para comer, banheiro e banho — caso contrário, mantenha a posição.
• A visão e a percepção de profundidade estarão prejudicadas. Tome cuidado em escadas e ao caminhar.

Retorno Amanhã
Retorne amanhã para laser ou crioterapia para selar permanentemente o rasgo. Sem este passo, a retina pode descolar novamente.

Colírios
• Ofloxacina (Ocuflox) antibiótica, 4 vezes ao dia por 4 dias. Continue outros colírios prescritos.

Bolha de Gás (SF6) — Dura Cerca de 2 Semanas
• NÃO voe, viaje a altitudes elevadas ou mergulhe até a bolha desaparecer. Mudanças de altitude podem causar aumentos perigosos de pressão dentro do olho.
• Use a pulseira verde o tempo todo — ela alerta outros profissionais sobre a bolha. Informe qualquer outro médico antes de qualquer cirurgia.

Restrições de Atividade
• Não levante objetos pesados (mais de 5–10 lbs), nade ou submerja o olho por 1 semana.
• Não esfregue o olho. Não dirija enquanto a visão estiver prejudicada.

Ligue Imediatamente
Contate seu oftalmologista imediatamente se você experimentar:
• Diminuição súbita ou significativa da visão.
• Dor ocular severa ou que piora.
• Pus, secreção amarela ou espessa, ou aumento de vermelhidão/inchaço (sinais de infecção — endoftalmite).
• Uma sombra ou cortina nova, ou aumento súbito de moscas volantes ou flashes (sinais de piora do descolamento).`
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // CONDITIONS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "cond-amd-overview",
    category: "condition",
    title: { en: "Age-Related Macular Degeneration (AMD) — Overview", es: "Degeneración Macular (DMAE) — General", vi: "Thoái Hóa Hoàng Điểm (AMD) — Tổng Quan", pt: "Degeneração Macular (DMRI) — Visão Geral" },
    tags: ["AMD", "macular degeneration", "overview", "drusen", "AREDS"],
    content: {
      en: `AGE-RELATED MACULAR DEGENERATION (AMD)

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is AMD?
Age-related macular degeneration (AMD) is a disease of the retina. It happens when a part of the retina called the macula is damaged. AMD causes loss of central vision, but your peripheral (side) vision will still be normal.

For instance, imagine looking at someone's face. With AMD, you might see their hair and clothing clearly, but have trouble making out their eyes, nose, or expression — the center of your vision may look blurry, dark, or missing.

AMD is very common. It is a leading cause of vision loss in people 50 years or older. Many people don't realize they have AMD until their vision is very blurry. This is why it is important to have regular visits to your ophthalmologist. They can look for early signs of AMD before you have any vision problems.

[IMAGE_PAIR:amd-oct-before|Before Treatment (Wet AMD)|amd-oct-after|After Treatment (Resolved)|OCT cross-section showing fluid under the retina before treatment and resolution after anti-VEGF injections.]

Two Types of AMD
• Dry AMD: This form is quite common. About 80% (8 out of 10) of people who have AMD have the dry form. Dry AMD is when parts of the macula get thinner with age and tiny deposits (drusen) build up. People with dry AMD may have drusen, pigment changes, or geographic atrophy (an area of cell loss in the retina). Geographic atrophy can cause loss of central vision. Treatment options for dry AMD are growing. Photobiomodulation (PBM) therapy uses low-level light to support retinal cells, and newer medications can slow geographic atrophy. Your doctor will discuss which treatments may be right for you.
• Wet AMD: This form is less common but much more serious. Wet AMD is when new, abnormal blood vessels grow under the retina. These vessels may leak blood or other fluids, causing scarring of the macula. Vision loss is faster with wet AMD than dry AMD. Wet AMD is treated with anti-VEGF injections.

Risk Factors
You are more likely to develop AMD if you:
• Are over 50 years old.
• Have a family history of AMD.
• Smoke cigarettes.
• Eat a diet high in saturated fat (meat, butter, cheese).
• Are overweight.
• Have high blood pressure or high cholesterol.
• Have heart disease.

How Is AMD Diagnosed?
• Dilated eye exam — your ophthalmologist will put drops in your eye to dilate your pupil, then look through a special lens to check the retina and macula.
• OCT (Optical Coherence Tomography) — a painless scan that provides very detailed images of the retina and macula.
• OCTA (OCT Angiography) — looks closely at blood vessels in and under the retina without needing a dye.
• Fluorescein angiography — a yellow dye is injected into a vein in your arm and a camera photographs the retina, showing if abnormal new blood vessels are growing.

Treatment
• Dry AMD: People with lots of drusen or serious vision loss might benefit from AREDS2 vitamins: Vitamin C (500 mg), Vitamin E (400 IU), Lutein (10 mg), Zeaxanthin (2 mg), Zinc (80 mg), Copper (2 mg). Your ophthalmologist can tell you if these are recommended for you. Beta carotene should not be used by smokers as it raised the risk of lung cancer. For geographic atrophy, newer medications (such as Izervay or Syfovre) injected into the eye may slow progression. Photobiomodulation (PBM) therapy uses low-level light to support retinal health and may help reduce drusen burden.
• Wet AMD: Anti-VEGF medications (such as Avastin, Lucentis, Eylea, Eylea HD, Beovu, and Vabysmo) are injected into the eye to reduce leaking from abnormal blood vessels. Treatment starts with monthly injections, then may be extended based on your response. Early and consistent treatment gives the best chance of preserving vision. That is why it is critical to contact your doctor right away if you notice any sudden change on your Amsler grid.

What You Can Do
• Keep all scheduled appointments — even if vision feels stable. Skipping treatment can lead to permanent vision loss.
• Use the Amsler grid daily to monitor for changes. Check one eye at a time with your reading glasses on. Keep it in a place where you see it every day (like the refrigerator or bathroom mirror).
• Take AREDS2 vitamins as recommended by your doctor.
• Do not smoke.
• Eat leafy greens (spinach, kale), yellow fruits, fish, and a balanced, nutrient-rich diet.
• Exercise regularly, manage blood pressure and cholesterol.
• Wear UV-protective sunglasses outdoors.

Making the Most of Your Vision
If you have AMD, you can often still do many of your favorite things with special low vision tools — magnifying glasses, handheld computers, electronic items, and more. Good lighting and high-contrast materials (such as large-print books or bold-lined writing paper) can also make everyday tasks easier. A vision rehabilitation specialist can teach you how to use your side vision and help you find support services and tools. Ask your ophthalmologist for a referral.

Test Your Vision with the Amsler Grid
Keep the Amsler grid in a place where you see it every day. In good light, look at the grid from about 12 to 15 inches away. Be sure to wear your reading glasses if you normally use them. Cover one eye. Look directly at the dot in the center of the grid. Notice if any of the lines look bent or wavy. See if any part of the grid looks blurry, dim, or out of shape. Now cover your other eye and test your vision the same way again. Call your ophthalmologist right away if you notice that any lines or parts of the grid look wavy, blurry, or dim.

When to Call Right Away
Contact your eye doctor immediately if you experience:
• New or worsening blurry or distorted central vision.
• Straight lines that look wavy or bent (metamorphopsia).
• A new dark or empty spot in the center of your vision.
• Any sudden change in your Amsler grid test.
• Difficulty reading, recognizing faces, or driving.
These may indicate wet AMD development or progression and need prompt evaluation.`,

      es: `DEGENERACIÓN MACULAR RELACIONADA CON LA EDAD (DMAE)

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es la DMAE?
Enfermedad de la retina que daña la mácula, causando pérdida de visión central. Su visión periférica (lateral) permanece normal. Imagine que mira la cara de alguien: puede ver su cabello y ropa claramente, pero tiene dificultad para distinguir sus ojos, nariz o expresión — el centro de su visión puede verse borroso, oscuro o vacío. Es la principal causa de pérdida visual en personas mayores de 50 años. Muchos no se dan cuenta hasta que la visión está muy borrosa.

[IMAGE_PAIR:amd-oct-before|Antes del Tratamiento (DMAE Húmeda)|amd-oct-after|Después del Tratamiento (Resuelto)|OCT mostrando líquido bajo la retina antes y resolución después de inyecciones anti-VEGF.]

Dos Tipos
• DMAE Seca: Más común (~80%). La mácula se adelgaza y se acumulan drusen. Puede incluir atrofia geográfica (pérdida de células en la retina). Las opciones de tratamiento están creciendo: la terapia de fotobiomodulación (PBM) usa luz de bajo nivel para apoyar las células retinianas, y medicamentos más nuevos pueden retardar la atrofia geográfica. Su médico le indicará qué tratamientos son adecuados para usted.
• DMAE Húmeda: Menos común pero más seria. Vasos sanguíneos anormales crecen bajo la retina y filtran sangre o líquido. La pérdida visual es más rápida. Se trata con inyecciones anti-VEGF.

Factores de Riesgo
• Mayor de 50 años, historia familiar, tabaquismo, dieta alta en grasas saturadas, sobrepeso, presión alta, colesterol alto, enfermedades cardíacas.

¿Cómo Se Diagnostica?
• Examen con dilatación, OCT, OCTA, angiografía con fluoresceína.

Tratamiento
• DMAE Seca: Vitaminas AREDS2 (Vitamina C 500mg, Vitamina E 400UI, Luteína 10mg, Zeaxantina 2mg, Zinc 80mg, Cobre 2mg). Para atrofia geográfica: medicamentos más nuevos (Izervay, Syfovre). Beta caroteno NO para fumadores. La terapia de fotobiomodulación (PBM) usa luz de bajo nivel para apoyar la salud retiniana y puede ayudar a reducir la carga de drusen.
• DMAE Húmeda: Inyecciones anti-VEGF (Avastin, Lucentis, Eylea, Eylea HD, Beovu, Vabysmo) para reducir fugas. Tratamiento comienza mensual, luego se extiende según respuesta. El tratamiento temprano y constante da la mejor oportunidad de preservar la visión. Por eso es fundamental que contacte a su médico de inmediato si nota algún cambio repentino en la cuadrícula de Amsler.

Lo Que Puede Hacer
• Asista a todas las citas programadas.
• Use la cuadrícula de Amsler diariamente. Revise un ojo a la vez con sus lentes de lectura puestos.
• Tome vitaminas AREDS2 según recomendación.
• No fume. Coma vegetales de hoja verde, frutas amarillas, pescado.
• Ejercicio regular, controle presión arterial y colesterol.
• Use lentes de sol con protección UV.

Aprovechando al Máximo Su Visión
Si tiene DMAE, a menudo puede seguir haciendo muchas de sus actividades favoritas con herramientas especiales de baja visión — lupas, dispositivos electrónicos y más. La buena iluminación y los materiales de alto contraste (como libros con letra grande o papel con líneas gruesas) también facilitan las tareas diarias. Un especialista en rehabilitación visual puede enseñarle a usar su visión lateral y ayudarle a encontrar servicios y herramientas de apoyo. Pida una referencia a su oftalmólogo.

Cuándo Llamar de Inmediato
• Visión central borrosa o distorsionada nueva o que empeora.
• Líneas rectas que se ven onduladas.
• Punto oscuro o vacío nuevo en la visión central.
• Cualquier cambio súbito en la cuadrícula de Amsler.`,

      vi: `THOÁI HÓA HOÀNG ĐIỂM TUỔI GIÀ (AMD)

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

AMD Là Gì?
Bệnh võng mạc gây tổn thương hoàng điểm, mất thị lực trung tâm nhưng thị lực ngoại vi (bên) vẫn bình thường. Hãy tưởng tượng nhìn khuôn mặt ai đó: bạn có thể thấy rõ tóc và quần áo, nhưng khó phân biệt mắt, mũi hay biểu cảm — trung tâm tầm nhìn có thể mờ, tối hoặc trống. Nguyên nhân hàng đầu mất thị lực ở người trên 50 tuổi. Nhiều người không biết cho đến khi rất mờ.

[IMAGE_PAIR:amd-oct-before|Trước Điều Trị (AMD Ướt)|amd-oct-after|Sau Điều Trị (Hết)|OCT cho thấy dịch dưới võng mạc trước và hết sau tiêm anti-VEGF.]

Hai Loại
• AMD Khô: Phổ biến hơn (~80%). Hoàng điểm mỏng đi và tích tụ drusen. Có thể bao gồm teo địa lý (mất tế bào). Các lựa chọn điều trị đang phát triển: liệu pháp quang sinh học (PBM) sử dụng ánh sáng cường độ thấp để hỗ trợ tế bào võng mạc, và thuốc mới có thể làm chậm teo địa lý. Bác sĩ sẽ trao đổi phương pháp điều trị phù hợp với bạn.
• AMD Ướt: Ít phổ biến nhưng nghiêm trọng hơn. Mạch máu bất thường mọc dưới võng mạc và rò rỉ. Mất thị lực nhanh hơn. Điều trị bằng tiêm anti-VEGF.

Yếu Tố Nguy Cơ
• Trên 50 tuổi, tiền sử gia đình, hút thuốc, chế độ ăn nhiều chất béo bão hòa, thừa cân, tăng huyết áp, cholesterol cao, bệnh tim.

Chẩn Đoán
• Khám mắt có giãn đồng tử, OCT, OCTA, chụp mạch huỳnh quang.

Điều Trị
• AMD Khô: Vitamin AREDS2 (Vitamin C 500mg, Vitamin E 400IU, Lutein 10mg, Zeaxanthin 2mg, Kẽm 80mg, Đồng 2mg). Cho teo địa lý: thuốc mới (Izervay, Syfovre). Beta carotene KHÔNG cho người hút thuốc. Liệu pháp quang sinh học (PBM) sử dụng ánh sáng cường độ thấp để hỗ trợ sức khỏe võng mạc và có thể giúp giảm gánh nặng drusen.
• AMD Ướt: Tiêm anti-VEGF (Avastin, Lucentis, Eylea, Eylea HD, Beovu, Vabysmo) giảm rò rỉ. Bắt đầu hàng tháng, sau kéo dài theo đáp ứng. Điều trị sớm và đều đặn mang lại cơ hội tốt nhất để bảo tồn thị lực. Vì vậy, điều quan trọng là liên hệ bác sĩ ngay nếu bạn nhận thấy bất kỳ thay đổi đột ngột nào trên lưới Amsler.

Bạn Có Thể Làm Gì
• Giữ tất cả lịch hẹn.
• Dùng lưới Amsler hàng ngày. Kiểm tra từng mắt một với kính đọc sách.
• Uống vitamin AREDS2 theo khuyến nghị.
• Không hút thuốc. Ăn rau xanh lá, trái cây vàng, cá.
• Tập thể dục, kiểm soát huyết áp và cholesterol.
• Đeo kính râm chống tia UV.

Tận Dụng Tối Đa Thị Lực
Nếu bạn bị AMD, bạn vẫn có thể làm nhiều hoạt động yêu thích với các công cụ hỗ trợ thị lực kém — kính lúp, thiết bị điện tử và nhiều hơn nữa. Ánh sáng tốt và vật liệu có độ tương phản cao (sách chữ lớn, giấy kẻ đậm) cũng giúp các công việc hàng ngày dễ dàng hơn. Chuyên gia phục hồi thị lực có thể hướng dẫn bạn sử dụng thị lực bên và tìm dịch vụ hỗ trợ. Hãy xin giấy giới thiệu từ bác sĩ nhãn khoa.

Khi Nào Cần Gọi Ngay
• Mờ hoặc méo thị lực trung tâm mới hoặc nặng hơn.
• Đường thẳng trông lượn sóng.
• Đốm tối hoặc trống mới ở trung tâm.
• Thay đổi đột ngột trên lưới Amsler.`,

      pt: `DEGENERAÇÃO MACULAR RELACIONADA À IDADE (DMRI)

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É DMRI?
Doença da retina que danifica a mácula, causando perda de visão central. A visão periférica (lateral) permanece normal. Imagine olhar para o rosto de alguém: pode ver claramente o cabelo e a roupa, mas tem dificuldade em distinguir os olhos, nariz ou expressão — o centro da visão pode ficar embaçado, escuro ou vazio. Principal causa de perda visual em pessoas acima de 50 anos. Muitos não percebem até a visão estar muito embaçada.

[IMAGE_PAIR:amd-oct-before|Antes do Tratamento (DMRI Úmida)|amd-oct-after|Após Tratamento (Resolvido)|OCT mostrando fluido sob a retina antes e resolução após injeções anti-VEGF.]

Dois Tipos
• DMRI Seca: Mais comum (~80%). A mácula afina e se acumulam drusen. Pode incluir atrofia geográfica (perda de células). As opções de tratamento estão crescendo: a terapia de fotobiomodulação (PBM) usa luz de baixa intensidade para apoiar as células da retina, e medicamentos mais novos podem retardar a atrofia geográfica. Seu médico discutirá quais tratamentos são adequados para você.
• DMRI Úmida: Menos comum mas mais séria. Vasos anormais crescem sob a retina e vazam sangue ou fluido. Perda visual mais rápida. Tratada com injeções anti-VEGF.

Fatores de Risco
• Acima de 50 anos, história familiar, tabagismo, dieta rica em gordura saturada, sobrepeso, pressão alta, colesterol alto, doença cardíaca.

Como É Diagnosticada?
• Exame com dilatação, OCT, OCTA, angiografia com fluoresceína.

Tratamento
• DMRI Seca: Vitaminas AREDS2 (Vitamina C 500mg, Vitamina E 400UI, Luteína 10mg, Zeaxantina 2mg, Zinco 80mg, Cobre 2mg). Para atrofia geográfica: medicamentos mais novos (Izervay, Syfovre). Beta caroteno NÃO para fumantes. A terapia de fotobiomodulação (PBM) usa luz de baixa intensidade para apoiar a saúde da retina e pode ajudar a reduzir a carga de drusen.
• DMRI Úmida: Injeções anti-VEGF (Avastin, Lucentis, Eylea, Eylea HD, Beovu, Vabysmo) para reduzir vazamento. Tratamento começa mensal, depois estendido conforme resposta. Tratamento precoce e consistente oferece a melhor chance de preservar a visão. Por isso é fundamental entrar em contato com seu médico imediatamente se notar qualquer mudança súbita na grade de Amsler.

O Que Você Pode Fazer
• Compareça a todas as consultas.
• Use a grade de Amsler diariamente. Verifique um olho de cada vez com seus óculos de leitura.
• Tome vitaminas AREDS2 conforme recomendado.
• Não fume. Coma vegetais verde-escuros, frutas amarelas, peixe.
• Exercício regular, controle pressão arterial e colesterol.
• Use óculos de sol com proteção UV.

Aproveitando ao Máximo Sua Visão
Se você tem DMRI, muitas vezes ainda pode fazer suas atividades favoritas com ferramentas especiais de baixa visão — lupas, dispositivos eletrônicos e mais. Boa iluminação e materiais de alto contraste (como livros com letras grandes ou papel com linhas grossas) também facilitam as tarefas do dia a dia. Um especialista em reabilitação visual pode ensinar você a usar sua visão lateral e encontrar serviços de apoio. Peça um encaminhamento ao seu oftalmologista.

Quando Ligar Imediatamente
• Visão central embaçada ou distorcida nova ou piorando.
• Linhas retas que parecem onduladas.
• Ponto escuro ou vazio novo no centro da visão.
• Qualquer mudança súbita na grade de Amsler.`
    }
  },
  {
    id: "cond-wet-amd",
    category: "condition",
    title: { en: "Wet Age-Related Macular Degeneration (Wet AMD)", es: "Degeneración Macular Húmeda (DMAE Húmeda)", vi: "Thoái Hóa Hoàng Điểm Ướt (AMD Ướt)", pt: "Degeneração Macular Úmida (DMRI Úmida)" },
    tags: ["AMD", "wet", "macular degeneration", "anti-VEGF"],
    content: {
      en: `WET AGE-RELATED MACULAR DEGENERATION (WET AMD)

Eye Words to Know
• Retina: The layer at the back of the eye that senses light and sends signals to the brain so you can see.
• Macula: A small but important area in the middle of the retina that gives us sharp, central vision.
• Drusen: Tiny white or yellow deposits that build up under the retina. Many or very large drusen can be a sign of AMD.

What Is Wet AMD?
Age-related macular degeneration (AMD) is a disease of the retina. In wet AMD, new abnormal blood vessels grow under the retina and may leak blood or other fluids, causing scarring of the macula. Vision loss is faster with wet AMD than dry AMD. About 10–20% of AMD cases are the wet form, but it is much more serious.

Imagine looking at a clock with hands. With AMD, you might see the clock's numbers but not the hands — dark areas may appear in your central vision, while your side (peripheral) vision stays normal.

Many people don't realize they have AMD until their vision is very blurry. This is why regular visits to your ophthalmologist are so important.

Symptoms
• Blurry or distorted central vision.
• Straight lines appear wavy (metamorphopsia).
• A dark or empty spot in the center of your vision.
• Difficulty reading, recognizing faces, or driving.
• Symptoms can develop suddenly — call us right away if you notice changes.

Risk Factors
• Over age 50.
• Family history of AMD.
• Smoking.
• Diet high in saturated fat (meat, butter, cheese).
• Overweight.
• High blood pressure or high cholesterol.
• Heart disease.

How Is It Diagnosed?
Your ophthalmologist will put drops in your eye to dilate your pupil, then look through a special lens to check the retina and macula.
• OCT (Optical Coherence Tomography) — a machine that scans the retina and provides very detailed images, like an ultrasound but using light.
• OCTA (OCT Angiography) — looks closely at blood vessels in and under the retina without needing a dye.
• Fluorescein Angiography — a yellow dye is injected into a vein in your arm, and a special camera photographs the retina as the dye travels through, showing if abnormal vessels are leaking.

Treatment
• Anti-VEGF injections — medications injected into the eye that block abnormal blood vessel growth and reduce leakage.
• Common medications: Eylea, Avastin, Lucentis, Vabysmo.
• Treatment starts with monthly injections, then may be extended based on your response.
• Early and consistent treatment gives the best chance of preserving vision.

What You Can Do
• Keep all scheduled appointments — even if vision feels stable. Skipping treatment can lead to permanent vision loss.
• Use the Amsler grid daily to monitor for changes (ask us for one if you don't have it).
• Take AREDS2 vitamins as recommended by your doctor.
• Do not smoke.
• Eat leafy greens (spinach, kale), fish, and nuts.
• Exercise regularly, manage blood pressure and cholesterol.
• Wear UV-protective sunglasses outdoors.

Making the Most of Your Vision
If you have AMD, you can learn to make the most of your vision. A vision rehabilitation specialist can help you find magnifying tools, special low vision devices, and new ways to be as independent as possible. Ask your ophthalmologist for a referral.

Prognosis
With consistent treatment, most patients can stabilize or improve their vision. The key is early detection and not missing appointments.`,

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

Eye Words to Know
• Retina: The layer at the back of the eye that senses light and sends signals to the brain so you can see.
• Macula: A small but important area in the middle of the retina that gives us sharp, central vision.
• Drusen: Tiny white or yellow deposits that build up under the retina. Many or very large drusen can be a sign of AMD.

What Is Dry AMD?
Dry AMD is the most common form of age-related macular degeneration (~80–90% of cases). Parts of the macula get thinner with age and tiny deposits called drusen build up. Vision loss is usually gradual.

Imagine looking at a clock with hands. With AMD, you might see the clock's numbers but not the hands — dark areas may appear in your central vision, while your side (peripheral) vision stays normal.

AMD is very common. It is a leading cause of vision loss in people 50 years or older.

Stages
• Early: Small drusen, usually no vision loss.
• Intermediate: Larger drusen and/or pigment changes. Mild vision changes may begin.
• Advanced (Geographic Atrophy): Areas of retinal cells permanently die, causing blind spots. See our separate handout on Geographic Atrophy.

Risk Factors
• Over age 50.
• Family history of AMD.
• Smoking.
• Diet high in saturated fat (meat, butter, cheese).
• Overweight.
• High blood pressure or high cholesterol.
• Heart disease.

How Is It Diagnosed?
Your ophthalmologist will dilate your eyes and look through a special lens to check for drusen and retinal changes.
• OCT (Optical Coherence Tomography) — a machine that scans the retina and provides very detailed images.
• You may be asked to look at an Amsler grid — a grid of straight lines that helps detect blurry, distorted, or blank spots in your vision.

Monitoring
• Regular exams with OCT imaging to track any changes.
• Amsler grid daily at home — report new distortion or wavy lines immediately. This could signal conversion to wet AMD, which needs urgent treatment.

Treatment
• AREDS2 vitamins can reduce the risk of progression in intermediate dry AMD. The recommended daily amounts are:
  - Vitamin C (500 mg)
  - Vitamin E (400 IU)
  - Lutein (10 mg)
  - Zeaxanthin (2 mg)
  - Zinc (80 mg)
  - Copper (2 mg)
• Important: Beta carotene should NOT be used by smokers or recent former smokers, as it raises the risk of lung cancer. The AREDS2 formula uses lutein and zeaxanthin instead.
• Your ophthalmologist can tell you if vitamins are recommended for your stage of AMD — not all forms will benefit.
• For Geographic Atrophy: Newer treatments (Syfovre, Izervay) can slow progression. Ask your doctor if you are a candidate.
• Valeda photobiomodulation may also help — ask your doctor.

Eye-Healthy Foods
Dark leafy greens (spinach, kale), yellow fruits and vegetables, fish, and a balanced nutrient-rich diet have been shown to be beneficial for people with AMD.

Lifestyle
• Do not smoke.
• Exercise regularly, manage blood pressure and cholesterol.
• Wear UV-protective sunglasses outdoors.
• Use the Amsler grid every day to monitor your vision.

Making the Most of Your Vision
If you have AMD, a vision rehabilitation specialist can help you find magnifying tools, high-contrast aids, and new ways to stay independent. Ask your ophthalmologist for a referral.`,

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

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is It?
A complication of diabetes that damages the tiny blood vessels in your retina. Over time, high blood sugar causes these vessels to swell, leak fluid, or close off entirely. When blood flow is cut off, the retina may try to grow new blood vessels — but these new vessels are fragile and bleed easily. Diabetic retinopathy is the leading cause of blindness in working-age adults, but it is manageable with early detection and treatment.

Stages
• Mild/Moderate Nonproliferative: Small hemorrhages and weakened vessel walls (microaneurysms). Some vessels may leak fluid or blood into the retina.
• Severe Nonproliferative: Many vessels are blocked, cutting off blood supply to parts of the retina. The retina sends signals for new vessel growth.
• Proliferative (PDR): Abnormal new vessels grow on the surface of the retina or optic nerve. These fragile vessels can bleed into the vitreous (vitreous hemorrhage) or pull on the retina, causing retinal detachment.

Diabetic Macular Edema (DME)
At any stage, damaged vessels can leak fluid into the macula, causing it to swell. This is called macular edema. It blurs your central vision — the vision you use for reading, driving, and recognizing faces. DME is the most common cause of vision loss from diabetic retinopathy. In severe cases, blood flow to the macula itself may be cut off (macular ischemia), which can cause permanent vision loss.

[IMAGE_PAIR:dr-oct-before|Before Treatment (DME)|dr-oct-after|After Treatment (Resolved)|OCT cross-section showing fluid resolution after anti-VEGF injection therapy.]

Symptoms
• Often NO symptoms early — this is why regular dilated exams are critical, even if your vision feels fine.
• Blurry or fluctuating vision (vision that changes from day to day).
• Floaters — dark spots or strings drifting across your vision.
• Blank or dark areas in your field of vision.
• Difficulty seeing at night or in low light.
• Colors appear faded or washed out.
• Sudden vision loss (if bleeding occurs inside the eye).

How Is It Diagnosed?
• Dilated eye exam — drops are placed to widen your pupils so the doctor can see the retina clearly.
• OCT (Optical Coherence Tomography) — a painless scan that shows fluid, swelling, or thinning in the retina in fine detail.
• Fluorescein angiography — a special dye is injected into your arm, and a camera photographs the dye as it flows through the retinal blood vessels. This reveals leaking, blocked, or abnormal vessels.
• OCT Angiography (OCTA) — a newer, dye-free scan that maps blood flow in the retina.

Treatment
Treatment depends on the stage and whether DME is present.
• DME: Anti-VEGF injections (such as Eylea, Avastin, or Vabysmo) are injected into the eye to reduce swelling and leakage. These are typically given as a series of injections over several months. Focal laser may also be used to seal leaking vessels near the macula. In some cases, steroid injections or implants (such as Ozurdex) may be recommended.
• Proliferative DR (PDR): PRP (panretinal photocoagulation) laser treats the peripheral retina to stop abnormal vessel growth. Anti-VEGF injections may also be used. If there is significant bleeding into the vitreous or retinal detachment, vitrectomy surgery may be needed to remove blood and repair the retina.
• Blood sugar control is the single most important thing you can do. Studies show that keeping your A1c well controlled significantly slows progression. Note: if your blood sugar has been very high and is brought down quickly, your vision may temporarily fluctuate. Wait at least one week after stabilizing blood sugar before getting a new glasses prescription.

What You Can Do
• Keep A1c below 7% (or as directed by your doctor).
• Control blood pressure and cholesterol — these also damage retinal vessels.
• Do not smoke. Smoking worsens blood vessel damage.
• Keep all scheduled eye appointments — even if your vision seems fine.
• Report new symptoms promptly to your eye doctor.
• Coordinate with your primary care doctor and kidney specialist if applicable — diabetes affects eyes, kidneys, and nerves together.
• If you have diabetes, get a dilated eye exam at least once a year.

When to Call Right Away
Contact your eye doctor immediately or seek urgent care if you experience:
• Sudden increase in floaters or dark spots.
• Flashes of light.
• A dark shadow or curtain covering part of your vision.
• Sudden, severe vision loss.
• Severe eye pain with redness (may indicate neovascular glaucoma).
These may be signs of bleeding inside the eye, retinal detachment, or dangerously high eye pressure — all are treatable but need prompt attention.`,

      es: `RETINOPATÍA DIABÉTICA

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es?
Una complicación de la diabetes que daña los pequeños vasos sanguíneos de la retina. Con el tiempo, el azúcar elevada hace que estos vasos se hinchen, filtren líquido o se cierren por completo. Cuando se corta el flujo sanguíneo, la retina puede intentar crear nuevos vasos — pero estos son frágiles y sangran fácilmente. Es la principal causa de ceguera en adultos en edad laboral, pero es manejable con detección y tratamiento tempranos.

Etapas
• No proliferativa leve/moderada: pequeñas hemorragias y paredes debilitadas de los vasos (microaneurismas). Algunos vasos pueden filtrar líquido o sangre.
• No proliferativa severa: muchos vasos están bloqueados, cortando el suministro de sangre a partes de la retina. La retina envía señales para que crezcan nuevos vasos.
• Proliferativa (RDP): crecen vasos anormales en la superficie de la retina o el nervio óptico. Estos vasos frágiles pueden sangrar dentro del vítreo (hemorragia vítrea) o tirar de la retina, causando desprendimiento de retina.

Edema Macular Diabético (EMD)
En cualquier etapa, los vasos dañados pueden filtrar líquido en la mácula, causando hinchazón. Esto nubla su visión central — la visión que usa para leer, conducir y reconocer caras. El EMD es la causa más común de pérdida visual por retinopatía diabética. En casos severos, se puede cortar el flujo sanguíneo a la mácula (isquemia macular), lo que puede causar pérdida permanente de visión.

[IMAGE_PAIR:dr-oct-before|Antes del Tratamiento (EMD)|dr-oct-after|Después del Tratamiento (Resuelto)|OCT mostrando resolución del líquido después de terapia con inyecciones anti-VEGF.]

Síntomas
• A menudo NO hay síntomas al principio — por eso los exámenes con dilatación son esenciales, aunque su visión parezca normal.
• Visión borrosa o fluctuante (que cambia de un día a otro).
• Moscas volantes — puntos oscuros o hilos que flotan en su visión.
• Áreas oscuras o en blanco en su campo visual.
• Dificultad para ver de noche o con poca luz.
• Los colores se ven desvanecidos o apagados.
• Pérdida súbita de visión (si hay sangrado dentro del ojo).

¿Cómo Se Diagnostica?
• Examen con dilatación — se colocan gotas para agrandar las pupilas y ver la retina claramente.
• OCT — un escaneo indoloro que muestra líquido, hinchazón o adelgazamiento de la retina en detalle.
• Angiografía con fluoresceína — se inyecta un tinte especial en el brazo y una cámara fotografía el tinte mientras fluye por los vasos retinianos, revelando fugas o vasos anormales.
• Angiografía por OCT (OCTA) — un escaneo más nuevo, sin tinte, que mapea el flujo sanguíneo en la retina.

Tratamiento
El tratamiento depende de la etapa y si hay EMD.
• EMD: Inyecciones anti-VEGF (como Eylea, Avastin o Vabysmo) se inyectan en el ojo para reducir la hinchazón y la fuga. Se administran como una serie de inyecciones durante varios meses. También se puede usar láser focal. En algunos casos se recomiendan inyecciones o implantes de esteroides (como Ozurdex).
• RDP: Láser PRP trata la retina periférica para detener el crecimiento de vasos anormales. También se pueden usar inyecciones anti-VEGF. Si hay sangrado significativo o desprendimiento de retina, puede ser necesaria una vitrectomía.
• El control del azúcar en sangre es lo más importante que puede hacer. Si su azúcar ha estado muy alta y baja rápidamente, su visión puede fluctuar temporalmente. Espere al menos una semana después de estabilizar el azúcar antes de obtener una nueva receta de lentes.

Lo Que Puede Hacer
• Mantenga A1c por debajo de 7% (o según indique su médico).
• Controle presión arterial y colesterol — también dañan los vasos retinianos.
• No fume. Fumar empeora el daño vascular.
• Asista a todas las citas oftalmológicas — aunque su visión parezca bien.
• Reporte síntomas nuevos a su oftalmólogo.
• Coordine con su médico primario y nefrólogo si aplica — la diabetes afecta ojos, riñones y nervios juntos.
• Si tiene diabetes, hágase un examen con dilatación al menos una vez al año.

Cuándo Llamar de Inmediato
Contacte a su oftalmólogo o busque atención urgente si experimenta:
• Aumento súbito de moscas volantes o manchas oscuras.
• Destellos de luz.
• Una sombra oscura o cortina cubriendo parte de su visión.
• Pérdida severa y súbita de visión.
• Dolor ocular severo con enrojecimiento (puede indicar glaucoma neovascular).
Estos pueden ser signos de sangrado dentro del ojo, desprendimiento de retina o presión ocular peligrosamente alta — todos son tratables pero necesitan atención inmediata.`,

      vi: `BỆNH VÕNG MẠC ĐÁI THÁO ĐƯỜNG

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Là Gì?
Biến chứng của đái tháo đường gây tổn thương các mạch máu nhỏ trong võng mạc. Theo thời gian, đường huyết cao khiến các mạch máu này sưng lên, rò rỉ dịch hoặc tắc nghẽn hoàn toàn. Khi dòng máu bị cắt, võng mạc có thể cố tạo ra mạch máu mới — nhưng các mạch mới này mỏng manh và dễ chảy máu. Đây là nguyên nhân hàng đầu gây mù ở người trưởng thành trong độ tuổi lao động, nhưng kiểm soát được nếu phát hiện và điều trị sớm.

Các Giai Đoạn
• Không tăng sinh nhẹ/trung bình: xuất huyết nhỏ và thành mạch yếu (vi phình mạch). Một số mạch có thể rò rỉ dịch hoặc máu.
• Không tăng sinh nặng: nhiều mạch bị tắc, cắt nguồn máu đến các phần võng mạc. Võng mạc gửi tín hiệu để mọc mạch mới.
• Tăng sinh (PDR): mạch máu bất thường mọc trên bề mặt võng mạc hoặc thần kinh thị. Các mạch mỏng manh này có thể chảy máu vào dịch kính (xuất huyết dịch kính) hoặc kéo võng mạc, gây bong võng mạc.

Phù Hoàng Điểm Đái Tháo Đường (DME)
Ở bất kỳ giai đoạn nào, mạch máu bị tổn thương có thể rò rỉ dịch vào hoàng điểm, gây sưng. Điều này làm mờ thị lực trung tâm — thị lực bạn dùng để đọc, lái xe và nhận diện khuôn mặt. DME là nguyên nhân mất thị lực phổ biến nhất từ bệnh võng mạc đái tháo đường. Trong trường hợp nặng, dòng máu đến hoàng điểm có thể bị cắt (thiếu máu hoàng điểm), gây mất thị lực vĩnh viễn.

[IMAGE_PAIR:dr-oct-before|Trước Điều Trị (DME)|dr-oct-after|Sau Điều Trị (Hết Phù)|OCT cho thấy dịch giảm sau tiêm anti-VEGF.]

Triệu Chứng
• Thường KHÔNG có triệu chứng sớm — đó là lý do khám mắt có giãn đồng tử định kỳ rất quan trọng.
• Thị lực mờ hoặc dao động (thay đổi từ ngày này sang ngày khác).
• Ruồi bay — đốm tối hoặc sợi trôi nổi trong tầm nhìn.
• Vùng tối hoặc trống trong trường nhìn.
• Khó nhìn ban đêm hoặc trong ánh sáng yếu.
• Màu sắc nhạt hoặc bạc màu.
• Mất thị lực đột ngột (nếu chảy máu trong mắt).

Chẩn Đoán Như Thế Nào?
• Khám mắt có giãn đồng tử — nhỏ thuốc giãn đồng tử để bác sĩ nhìn rõ võng mạc.
• OCT — quét không đau cho thấy dịch, sưng hoặc mỏng võng mạc chi tiết.
• Chụp mạch huỳnh quang — tiêm thuốc nhuộm đặc biệt vào cánh tay, camera chụp thuốc nhuộm chạy qua mạch máu võng mạc, phát hiện rò rỉ hoặc mạch bất thường.
• Chụp mạch OCT (OCTA) — phương pháp quét mới, không cần thuốc nhuộm, lập bản đồ dòng máu trong võng mạc.

Điều Trị
Điều trị phụ thuộc vào giai đoạn và có DME hay không.
• DME: Tiêm anti-VEGF (như Eylea, Avastin hoặc Vabysmo) vào mắt để giảm sưng và rò rỉ. Thường tiêm nhiều lần trong vài tháng. Có thể dùng laser tiêu điểm. Trong một số trường hợp, có thể dùng tiêm hoặc cấy steroid (như Ozurdex).
• Tăng sinh: Laser PRP điều trị võng mạc ngoại vi để ngăn mạch bất thường phát triển. Có thể dùng thêm tiêm anti-VEGF. Nếu chảy máu nhiều hoặc bong võng mạc, có thể cần phẫu thuật cắt dịch kính.
• Kiểm soát đường huyết là điều quan trọng nhất. Nếu đường huyết rất cao rồi giảm nhanh, thị lực có thể dao động tạm thời. Hãy đợi ít nhất một tuần sau khi ổn định đường huyết trước khi đo kính mới.

Bạn Có Thể Làm Gì
• Giữ A1c dưới 7% (hoặc theo chỉ dẫn bác sĩ).
• Kiểm soát huyết áp và cholesterol — cũng gây hại mạch máu võng mạc.
• Không hút thuốc. Hút thuốc làm tổn thương mạch máu nặng hơn.
• Giữ tất cả lịch khám mắt — dù thị lực có vẻ bình thường.
• Báo triệu chứng mới cho bác sĩ mắt.
• Phối hợp với bác sĩ đa khoa và bác sĩ thận nếu cần — đái tháo đường ảnh hưởng mắt, thận và thần kinh cùng lúc.
• Nếu bạn bị đái tháo đường, hãy khám mắt có giãn đồng tử ít nhất mỗi năm một lần.

Khi Nào Cần Gọi Ngay
Liên hệ bác sĩ mắt ngay hoặc đi cấp cứu nếu bạn gặp:
• Tăng đột ngột ruồi bay hoặc đốm tối.
• Chớp sáng.
• Bóng tối hoặc màn che một phần tầm nhìn.
• Mất thị lực nặng và đột ngột.
• Đau mắt dữ dội kèm đỏ mắt (có thể là glaucoma tân mạch).
Đây có thể là dấu hiệu chảy máu trong mắt, bong võng mạc hoặc áp lực mắt cao nguy hiểm — tất cả đều điều trị được nhưng cần chú ý kịp thời.`,

      pt: `RETINOPATIA DIABÉTICA

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É?
Uma complicação do diabetes que danifica os pequenos vasos sanguíneos da retina. Com o tempo, a glicemia alta faz com que esses vasos inchem, vazem líquido ou se fechem completamente. Quando o fluxo sanguíneo é interrompido, a retina pode tentar criar novos vasos — mas estes são frágeis e sangram facilmente. É a principal causa de cegueira em adultos em idade laboral, mas é controlável com detecção e tratamento precoces.

Estágios
• Não proliferativa leve/moderada: pequenas hemorragias e paredes vasculares enfraquecidas (microaneurismas). Alguns vasos podem vazar líquido ou sangue.
• Não proliferativa grave: muitos vasos estão bloqueados, cortando o suprimento sanguíneo para partes da retina. A retina envia sinais para crescer novos vasos.
• Proliferativa (RDP): vasos anormais crescem na superfície da retina ou nervo óptico. Esses vasos frágeis podem sangrar no vítreo (hemorragia vítrea) ou puxar a retina, causando descolamento de retina.

Edema Macular Diabético (EMD)
Em qualquer estágio, vasos danificados podem vazar líquido na mácula, causando inchaço. Isso embaça a visão central — a visão usada para ler, dirigir e reconhecer rostos. O EMD é a causa mais comum de perda visual por retinopatia diabética. Em casos graves, o fluxo sanguíneo para a mácula pode ser interrompido (isquemia macular), causando perda permanente de visão.

[IMAGE_PAIR:dr-oct-before|Antes do Tratamento (EMD)|dr-oct-after|Após Tratamento (Resolvido)|OCT mostrando resolução do líquido após terapia com injeções anti-VEGF.]

Sintomas
• Frequentemente SEM sintomas no início — por isso exames com dilatação regulares são essenciais, mesmo que sua visão pareça normal.
• Visão embaçada ou flutuante (que muda de um dia para o outro).
• Moscas volantes — pontos escuros ou fios flutuando na visão.
• Áreas escuras ou em branco no campo visual.
• Dificuldade para enxergar à noite ou com pouca luz.
• Cores parecem desbotadas ou apagadas.
• Perda súbita de visão (se houver sangramento dentro do olho).

Como É Diagnosticada?
• Exame com dilatação — colírios são aplicados para dilatar as pupilas e o médico poder ver a retina claramente.
• OCT — exame indolor que mostra líquido, inchaço ou afinamento da retina em detalhes.
• Angiografia com fluoresceína — um corante especial é injetado no braço e uma câmera fotografa o corante fluindo pelos vasos retinianos, revelando vazamentos ou vasos anormais.
• Angiografia por OCT (OCTA) — exame mais novo, sem corante, que mapeia o fluxo sanguíneo na retina.

Tratamento
O tratamento depende do estágio e se há EMD.
• EMD: Injeções anti-VEGF (como Eylea, Avastin ou Vabysmo) são aplicadas no olho para reduzir inchaço e vazamento. São administradas como uma série de injeções ao longo de vários meses. Laser focal também pode ser usado. Em alguns casos, injeções ou implantes de esteroides (como Ozurdex) podem ser recomendados.
• RDP: Laser PRP trata a retina periférica para interromper o crescimento de vasos anormais. Injeções anti-VEGF também podem ser usadas. Se houver sangramento significativo ou descolamento de retina, vitrectomia pode ser necessária.
• O controle da glicemia é a coisa mais importante que você pode fazer. Se sua glicemia estiver muito alta e cair rapidamente, sua visão pode flutuar temporariamente. Aguarde pelo menos uma semana após estabilizar a glicemia antes de fazer nova receita de óculos.

O Que Você Pode Fazer
• Mantenha A1c abaixo de 7% (ou conforme orientação médica).
• Controle pressão arterial e colesterol — também danificam os vasos retinianos.
• Não fume. Fumar piora o dano vascular.
• Compareça a todas as consultas oftalmológicas — mesmo que sua visão pareça boa.
• Reporte sintomas novos ao seu oftalmologista.
• Coordene com seu médico clínico e nefrologista se aplicável — o diabetes afeta olhos, rins e nervos juntos.
• Se você tem diabetes, faça exame com dilatação pelo menos uma vez ao ano.

Quando Ligar Imediatamente
Entre em contato com seu oftalmologista ou procure atendimento urgente se você tiver:
• Aumento súbito de moscas volantes ou manchas escuras.
• Flashes de luz.
• Uma sombra escura ou cortina cobrindo parte da sua visão.
• Perda severa e súbita de visão.
• Dor ocular severa com vermelhidão (pode indicar glaucoma neovascular).
Esses podem ser sinais de sangramento dentro do olho, descolamento de retina ou pressão ocular perigosamente alta — todos são tratáveis mas precisam de atenção imediata.`
    }
  },
  {
    id: "cond-rvo",
    category: "condition",
    title: { en: "Retinal Vein Occlusion (RVO)", es: "Oclusión Venosa Retiniana", vi: "Tắc Tĩnh Mạch Võng Mạc", pt: "Oclusão Venosa Retiniana" },
    tags: ["RVO", "BRVO", "CRVO", "vein occlusion"],
    content: {
      en: `RETINAL VEIN OCCLUSION (RVO)

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is It?
Your retina has veins and other blood vessels that carry blood. When a vein in your retina is blocked (occluded), it is called a retinal vein occlusion. This can be caused by a blood clot, or it can happen when a larger blood vessel presses down on the vein. With retinal vein occlusion, weaker blood vessels may end up carrying more blood. They might start to leak, causing the macula to swell or thicken. This is called macular edema, and it leads to blurry vision or vision loss. When blood flow is severely blocked, the retina may try to grow new blood vessels. These new vessels are fragile and abnormal. They can grow on the surface of the retina, where they may bleed into the vitreous gel (vitreous hemorrhage), causing sudden floaters or vision loss. They can also grow in the iris (colored part of your eye) or in other areas at the front of your eye, where they block the drainage of fluid and cause painful high pressure (neovascular glaucoma).

Types
• Central RVO (CRVO): The main vein of the eye is blocked, causing bleeding and swelling throughout the retina. Can cause more significant vision loss.
• Branch RVO (BRVO): A smaller branch vein attached to the main vein is blocked, causing bleeding in parts of the retina. Usually affects part of your vision.

Risk Factors
• High blood pressure (most common).
• Diabetes.
• Glaucoma (increased pressure inside the eye).
• Diseases related to blood vessels (vascular disease) or obesity.
• High cholesterol.
• Blood clotting disorders.
• Age over 50.
• Smoking.

Symptoms
• Sudden painless blurry or decreased vision in one eye.
• A lot of floaters in your field of vision.
• Dark areas or missing spots in your vision.
• Pain inside your eye if new blood vessels grow and cause high pressure (neovascular glaucoma).

[PAGE_BREAK]

How Is It Diagnosed?
• Dilated eye exam — drops are placed to widen your pupils so the doctor can look through a special lens at the inside of your eye and see the bleeding.
• Fluorescein angiography — a dye is injected into a vein in your arm and a camera photographs the retinal blood vessels, showing if any are blocked or leaking.
• OCT (Optical Coherence Tomography) — a painless scan that measures the thickness of the retina and shows swelling of the macula.

[IMAGE_PAIR:rvo-oct-before|Before Treatment|rvo-oct-after|After Treatment|OCT scan showing macular edema before and after anti-VEGF treatment]

Treatment
Your doctor will treat you based on what he or she sees in your eye. Treatment may include:
• Anti-VEGF injections (most common treatment) — medication injected into the eye to reduce swelling of the macula. This helps slow vision loss and may improve vision. Treatment is typically given as a series of injections over several months.
• Steroid injections or implants — in some cases, used to reduce inflammation and swelling.
• Laser surgery — may be used to shrink blood vessels that are bleeding or to prevent abnormal new vessels from growing.
• Managing your health — diabetes, glaucoma, high blood pressure, and other health problems can lead to retinal vein occlusion. Taking care of your health can keep you from getting this serious eye problem.

It is very important to call your ophthalmologist right away if you have any symptoms. Without treatment, retinal vein occlusion may lead to permanent vision loss.

When to Call Right Away
Contact your eye doctor immediately or seek urgent care if you experience:
• Sudden blurry vision or vision loss in one eye.
• Sudden increase in floaters.
• Pain in your eye with redness (may indicate neovascular glaucoma).
• A dark shadow or curtain covering part of your vision.
These may be signs of a serious complication that needs prompt treatment.`,

      es: `OCLUSIÓN VENOSA RETINIANA

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es?
Cuando una vena en la retina se bloquea (ocluye), la sangre y el líquido se filtran causando hinchazón y pérdida de visión. Puede ser causada por un coágulo o cuando un vaso más grande presiona la vena. Los vasos debilitados pueden filtrar, causando edema macular (hinchazón de la mácula). Cuando el flujo sanguíneo está severamente bloqueado, la retina puede intentar crecer vasos nuevos. Estos vasos son frágiles y anormales. Pueden crecer en la superficie de la retina, donde pueden sangrar hacia el gel vítreo (hemorragia vítrea), causando moscas volantes súbitas o pérdida de visión. También pueden crecer en el iris (la parte coloreada del ojo) o en otras áreas al frente del ojo, bloqueando el drenaje de líquido y causando presión alta dolorosa (glaucoma neovascular).

Tipos
• OVCR (central): La vena principal del ojo se bloquea, causando sangrado e hinchazón en toda la retina.
• ORVR (rama): Una vena menor se bloquea, causando sangrado en partes de la retina.

Factores de Riesgo
• Presión arterial alta (más común), diabetes, glaucoma, enfermedades vasculares u obesidad, colesterol alto, trastornos de coagulación, edad >50, tabaquismo.

Síntomas
• Visión borrosa o disminuida súbitamente en un ojo.
• Muchas moscas volantes.
• Áreas oscuras o puntos faltantes en la visión.
• Dolor ocular si crecen vasos nuevos y causan presión alta (glaucoma neovascular).

[PAGE_BREAK]

¿Cómo Se Diagnostica?
• Examen con dilatación para ver el sangrado.
• Angiografía con fluoresceína — tinte para ver vasos bloqueados o con fugas.
• OCT — escaneo indoloro que mide grosor de la retina y muestra hinchazón.

[IMAGE_PAIR:rvo-oct-before|Antes del Tratamiento|rvo-oct-after|Después del Tratamiento|Escaneo OCT mostrando edema macular antes y después del tratamiento con anti-VEGF]

Tratamiento
• Inyecciones anti-VEGF (tratamiento más común) — medicamento inyectado en el ojo para reducir la hinchazón de la mácula y mejorar la visión.
• Esteroides inyectados o implantados en algunos casos.
• Láser para vasos que sangran o para prevenir crecimiento de vasos anormales.
• Controlar su salud — presión arterial, diabetes, colesterol y glaucoma.

Es muy importante llamar a su oftalmólogo inmediatamente si tiene síntomas. Sin tratamiento, la oclusión venosa retiniana puede causar pérdida permanente de visión.

Cuándo Llamar de Inmediato
• Visión borrosa o pérdida súbita en un ojo.
• Aumento súbito de moscas volantes.
• Dolor ocular con enrojecimiento (puede indicar glaucoma neovascular).
• Sombra oscura o cortina cubriendo parte de su visión.`,

      vi: `TẮC TĨNH MẠCH VÕNG MẠC

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Là Gì?
Khi tĩnh mạch ở võng mạc bị tắc, máu và dịch rò rỉ gây sưng và mất thị lực. Có thể do cục máu đông hoặc mạch máu lớn hơn đè lên tĩnh mạch. Các mạch yếu có thể rò rỉ gây phù hoàng điểm (sưng hoàng điểm). Khi lưu lượng máu bị tắc nghẽn nghiêm trọng, võng mạc có thể cố gắng mọc mạch máu mới. Những mạch mới này yếu và bất thường. Chúng có thể mọc trên bề mặt võng mạc, nơi chúng có thể chảy máu vào gel dịch kính (xuất huyết dịch kính), gây ra hiện tượng đốm bay đột ngột hoặc mất thị lực. Chúng cũng có thể mọc ở mống mắt (phần có màu của mắt) hoặc các vùng phía trước mắt, chặn thoát dịch và gây áp lực cao đau đớn (glaucoma tân mạch).

Loại
• Tắc trung tâm (CRVO): Tĩnh mạch chính bị tắc, gây xuất huyết và sưng toàn bộ võng mạc.
• Tắc nhánh (BRVO): Tĩnh mạch nhánh bị tắc, gây xuất huyết ở một phần võng mạc.

Yếu Tố Nguy Cơ
• Tăng huyết áp (phổ biến nhất), đái tháo đường, glaucoma, bệnh mạch máu hoặc béo phì, cholesterol cao, rối loạn đông máu, trên 50 tuổi, hút thuốc.

Triệu Chứng
• Mờ hoặc giảm thị lực đột ngột ở một mắt.
• Nhiều ruồi bay.
• Vùng tối hoặc điểm thiếu trong tầm nhìn.
• Đau mắt nếu mạch mới mọc gây áp lực cao (glaucoma tân mạch).

[PAGE_BREAK]

Chẩn Đoán
• Khám mắt có giãn đồng tử để thấy xuất huyết.
• Chụp mạch huỳnh quang — thuốc nhuộm để thấy mạch tắc hoặc rò rỉ.
• OCT — quét không đau đo độ dày võng mạc và cho thấy phù.

[IMAGE_PAIR:rvo-oct-before|Trước Điều Trị|rvo-oct-after|Sau Điều Trị|Ảnh OCT cho thấy phù hoàng điểm trước và sau điều trị anti-VEGF]

Điều Trị
• Tiêm anti-VEGF (phương pháp điều trị phổ biến nhất) — thuốc tiêm vào mắt giảm phù hoàng điểm và cải thiện thị lực, thường tiêm nhiều lần trong vài tháng.
• Tiêm hoặc cấy steroid trong một số trường hợp.
• Laser để thu nhỏ mạch chảy máu hoặc ngăn mạch bất thường phát triển.
• Kiểm soát sức khỏe — huyết áp, đái tháo đường, cholesterol, glaucoma.

Rất quan trọng gọi bác sĩ ngay nếu có triệu chứng. Không điều trị, tắc tĩnh mạch võng mạc có thể gây mất thị lực vĩnh viễn.

Khi Nào Cần Gọi Ngay
• Mờ hoặc mất thị lực đột ngột ở một mắt.
• Tăng đột ngột ruồi bay.
• Đau mắt kèm đỏ (có thể là glaucoma tân mạch).
• Bóng tối hoặc màn che một phần tầm nhìn.`,

      pt: `OCLUSÃO VENOSA RETINIANA

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É?
Quando uma veia na retina fica bloqueada (ocluída), sangue e fluido vazam causando inchaço e perda de visão. Pode ser causada por coágulo ou quando um vaso maior pressiona a veia. Os vasos enfraquecidos podem vazar, causando edema macular (inchaço da mácula). Quando o fluxo sanguíneo está severamente bloqueado, a retina pode tentar crescer vasos novos. Esses vasos são frágeis e anormais. Podem crescer na superfície da retina, onde podem sangrar para dentro do gel vítreo (hemorragia vítrea), causando moscas volantes súbitas ou perda de visão. Também podem crescer na íris (a parte colorida do olho) ou em outras áreas na frente do olho, bloqueando a drenagem de fluido e causando pressão alta dolorosa (glaucoma neovascular).

Tipos
• OVCR (central): A veia principal do olho fica bloqueada, causando sangramento e inchaço em toda a retina.
• ORVR (ramo): Uma veia menor fica bloqueada, causando sangramento em partes da retina.

Fatores de Risco
• Pressão alta (mais comum), diabetes, glaucoma, doenças vasculares ou obesidade, colesterol alto, distúrbios de coagulação, idade >50, tabagismo.

Sintomas
• Visão embaçada ou diminuída subitamente em um olho.
• Muitas moscas volantes.
• Áreas escuras ou pontos faltando na visão.
• Dor no olho se vasos novos crescerem e causarem pressão alta (glaucoma neovascular).

[PAGE_BREAK]

Como É Diagnosticada?
• Exame com dilatação para ver o sangramento.
• Angiografia com fluoresceína — corante para ver vasos bloqueados ou com vazamento.
• OCT — exame indolor que mede espessura da retina e mostra inchaço.

[IMAGE_PAIR:rvo-oct-before|Antes do Tratamento|rvo-oct-after|Após o Tratamento|Exame OCT mostrando edema macular antes e após tratamento com anti-VEGF]

Tratamento
• Injeções anti-VEGF (tratamento mais comum) — medicamento injetado no olho para reduzir inchaço da mácula e melhorar visão, geralmente em série por vários meses.
• Esteroides injetados ou implantados em alguns casos.
• Laser para vasos que sangram ou para prevenir crescimento de vasos anormais.
• Cuidar da saúde — pressão arterial, diabetes, colesterol, glaucoma.

É muito importante ligar para seu oftalmologista imediatamente se tiver sintomas. Sem tratamento, a oclusão venosa retiniana pode causar perda permanente de visão.

Quando Ligar Imediatamente
• Visão embaçada ou perda súbita em um olho.
• Aumento súbito de moscas volantes.
• Dor no olho com vermelhidão (pode indicar glaucoma neovascular).
• Sombra escura ou cortina cobrindo parte da visão.`
    }
  },
  {
    id: "cond-pvd",
    category: "condition",
    title: { en: "Posterior Vitreous Detachment (PVD)", es: "Desprendimiento Vítreo Posterior (DVP)", vi: "Bong Dịch Kính Sau (PVD)", pt: "Descolamento Vítreo Posterior (DVP)" },
    tags: ["PVD", "floaters", "flashes", "vitreous"],
    content: {
      en: `POSTERIOR VITREOUS DETACHMENT (PVD) — FLASHES & FLOATERS

Eye Words to Know
• Retina — the layer of nerve cells lining the back wall inside the eye. It senses light and sends signals to the brain so you can see.
• Vitreous — the clear, gel-like substance that fills the inside of your eye. It helps the eye maintain its shape and also transmits light to the retina.

What Are Floaters?
Floaters look like small specks, dots, circles, lines, or cobwebs in your field of vision. They are actually tiny clumps floating inside the vitreous, and you notice them most against plain backgrounds like a blue sky or white wall. They are usually not serious and tend to fade over time. You are more likely to get floaters if you are nearsighted, have had cataract surgery, or have had inflammation inside the eye.

What Are Flashes?
Flashes can look like flashing lights or lightning streaks in your field of vision. Some people compare them to seeing "stars" after being hit on the head. You might see flashes on and off for weeks or even months. Flashes happen when the vitreous rubs or pulls on your retina. As people age, it is common to see flashes occasionally.

Flashes vs. Migraines
Some flashes look like jagged lines or heat waves lasting up to 20 minutes. These are usually caused by a migraine and may or may not be followed by a headache ("ophthalmic migraine"). They are generally not dangerous and are different from the flashes caused by the vitreous pulling on the retina.

What Is a PVD?
The vitreous is a clear gel that fills the inside of the eye. As we age, this gel naturally shrinks and eventually separates from the retina — this is called a posterior vitreous detachment (PVD). It is extremely common (most people over age 60 will develop one) and is usually harmless.

Is It Dangerous?
• In most cases, a PVD is completely harmless and requires no treatment.
• HOWEVER, in about 10–15% of cases, the vitreous can pull hard enough on the retina to cause a retinal tear. A tear, if not treated, can lead to a retinal detachment — a serious condition where the retina lifts away from the back of the eye.
• This is why NEW flashes and floaters always need a prompt dilated eye exam.

What to Expect
• If your exam shows a PVD WITHOUT a retinal tear: No treatment is needed. The floaters and flashes usually become less noticeable over weeks to months as your brain adapts.
• If a retinal tear IS found: It can usually be treated in the office with laser (photocoagulation) or freezing treatment (cryopexy) — both are quick, effective procedures that seal the retina and prevent detachment.

Living with Floaters
• Floaters are annoying but harmless. Most people notice them less over time.
• They are more visible against light backgrounds (blue sky, white walls, reading).
• No vitamins or drops can make floaters go away.
• In rare cases of severely debilitating floaters, surgical options exist (discuss with your doctor).

When to Call Immediately
Contact your eye doctor right away if you notice:
• A sudden shower of many new floaters.
• Persistent or new flashes of light.
• A shadow appears in your peripheral (side) vision.
• A gray curtain covers part of your vision.
• Any sudden loss of vision.
These could be symptoms of a retinal tear or detachment and may need same-day evaluation.`,

      es: `DESPRENDIMIENTO VÍTREO POSTERIOR (DVP) — DESTELLOS Y MOSCAS VOLANTES

Palabras Importantes
• Retina — capa de células nerviosas en la parte posterior del ojo que detecta luz y envía señales al cerebro.
• Vítreo — sustancia gelatinosa transparente que llena el interior del ojo.

¿Qué Son las Moscas Volantes?
Parecen pequeñas manchas, puntos, líneas o telarañas en su campo visual. Están flotando dentro del vítreo. Se notan más al mirar algo uniforme como una pared blanca o el cielo azul. Con la edad, el vítreo se espesa o encoge, formando grumos. Si se separa de la retina, es un DVP. Son comunes y tienden a desvanecerse. Es más probable tenerlas si es miope, tuvo cirugía de catarata, o tuvo inflamación ocular.

¿Qué Son los Destellos?
Parecen luces parpadeantes o relámpagos. Ocurren cuando el vítreo frota o tira de la retina. Pueden durar semanas o meses.

Destellos vs. Migrañas
A veces las personas ven líneas dentadas u ondas de calor en uno o ambos ojos por hasta 20 minutos. Esto puede ser una migraña — espasmo de vasos del cerebro. Si hay dolor de cabeza después, es "migraña." Sin dolor de cabeza se llama "migraña oftálmica." Generalmente no son peligrosas.

¿Qué Es un DVP?
El vítreo se encoge y se separa de la retina. Es extremadamente común (mayoría después de los 60) y usualmente inofensivo.

¿Es Peligroso?
• Generalmente, completamente inofensivo.
• PERO en ~10–15% de casos puede causar un desgarro retiniano, que sin tratar puede llevar a desprendimiento de retina.
• Por eso, destellos y moscas volantes NUEVOS siempre necesitan examen inmediato.

Qué Esperar
• Sin desgarro: No necesita tratamiento. Los síntomas mejoran con el tiempo.
• Con desgarro: Se puede tratar con láser (fotocoagulación) o congelamiento (criopexia) en el consultorio.

Vivir con Moscas Volantes
• Son molestas pero inofensivas. La mayoría las nota menos con el tiempo.
• Son más visibles contra fondos claros.
• No hay vitaminas ni gotas que las eliminen.
• En casos raros muy debilitantes, existen opciones quirúrgicas.

Cuándo Llamar de Inmediato
• Aparición súbita de muchas moscas volantes nuevas.
• Destellos de luz nuevos o persistentes.
• Sombra en su visión periférica (lateral).
• Cortina gris cubriendo parte de su visión.
• Cualquier pérdida súbita de visión.
Estos podrían indicar desgarro o desprendimiento de retina — necesitan evaluación el mismo día.`,

      vi: `BONG DỊCH KÍNH SAU (PVD) — CHỚP SÁNG VÀ RUỒI BAY

Từ Vựng Cần Biết
• Võng mạc — lớp tế bào thần kinh ở thành sau mắt, cảm nhận ánh sáng và gửi tín hiệu đến não.
• Dịch kính — chất gel trong suốt lấp đầy bên trong mắt.

Ruồi Bay Là Gì?
Trông như đốm nhỏ, chấm, đường hoặc mạng nhện trong tầm nhìn. Chúng thực sự trôi nổi bên trong dịch kính. Dễ thấy nhất khi nhìn nền trơn như tường trắng hoặc bầu trời. Với tuổi tác, dịch kính đặc lại hoặc co lại, tạo cục. Khi tách khỏi võng mạc gọi là PVD. Thường vô hại và giảm dần. Dễ gặp hơn nếu cận thị, đã phẫu thuật đục thủy tinh thể, hoặc bị viêm trong mắt.

Chớp Sáng Là Gì?
Trông như ánh sáng nhấp nháy hoặc tia chớp. Xảy ra khi dịch kính cọ hoặc kéo võng mạc. Có thể kéo dài vài tuần đến tháng.

Chớp Sáng và Đau Nửa Đầu
Đôi khi người ta thấy đường răng cưa hoặc sóng nhiệt ở một hoặc hai mắt, kéo dài đến 20 phút. Đây có thể là đau nửa đầu — co thắt mạch máu não. Có đau đầu sau gọi là "đau nửa đầu." Không đau đầu gọi là "đau nửa đầu nhãn khoa." Thường không nguy hiểm.

PVD Là Gì?
Dịch kính co lại tự nhiên và tách khỏi võng mạc. Rất phổ biến (hầu hết người trên 60 tuổi) và thường vô hại.

Có Nguy Hiểm Không?
• Hầu hết trường hợp hoàn toàn vô hại.
• NHƯNG khoảng 10–15% trường hợp có thể gây rách võng mạc, dẫn đến bong nếu không điều trị.
• Chớp sáng và ruồi bay MỚI luôn cần khám giãn đồng tử ngay.

Điều Cần Biết
• Không có rách: Không cần điều trị. Triệu chứng giảm theo thời gian.
• Có rách: Điều trị bằng laser (quang đông) hoặc đông lạnh (cryopexy) tại phòng khám.

Sống Với Ruồi Bay
• Phiền nhưng vô hại. Hầu hết người ta ít chú ý theo thời gian.
• Dễ thấy hơn trên nền sáng.
• Không có vitamin hay thuốc nhỏ nào loại bỏ được.
• Trường hợp hiếm rất nặng, có thể phẫu thuật.

Khi Nào Cần Gọi Ngay
• Đốm đen mới xuất hiện đột ngột nhiều.
• Chớp sáng mới hoặc liên tục.
• Bóng xuất hiện ở tầm nhìn ngoại vi.
• Màn xám che một phần tầm nhìn.
• Mất thị lực đột ngột.
Đây có thể là triệu chứng rách hoặc bong võng mạc — cần khám cùng ngày.`,

      pt: `DESCOLAMENTO VÍTREO POSTERIOR (DVP) — FLASHES E MOSCAS VOLANTES

Palavras Importantes
• Retina — camada de células nervosas no fundo do olho que detecta luz e envia sinais ao cérebro.
• Vítreo — substância gelatinosa transparente que preenche o interior do olho.

O Que São Moscas Volantes?
Parecem pequenas manchas, pontos, linhas ou teias na visão. Estão flutuando dentro do vítreo. São mais perceptíveis ao olhar para algo uniforme como parede branca ou céu azul. Com a idade, o vítreo engrossa ou encolhe, formando grumos. Se se separa da retina, é DVP. São comuns e tendem a diminuir. Mais prováveis se é míope, fez cirurgia de catarata, ou teve inflamação ocular.

O Que São Flashes?
Parecem luzes piscando ou relâmpagos na visão. Acontecem quando o vítreo esfrega ou puxa a retina. Podem durar semanas ou meses.

Flashes vs. Enxaquecas
Às vezes as pessoas veem linhas dentadas ou ondas de calor em um ou ambos os olhos por até 20 minutos. Pode ser enxaqueca — espasmo de vasos cerebrais. Com dor de cabeça depois = "enxaqueca." Sem dor de cabeça = "enxaqueca oftálmica." Geralmente não são perigosas.

O Que É DVP?
O vítreo encolhe naturalmente e se separa da retina. Extremamente comum (maioria após 60 anos) e geralmente inofensivo.

É Perigoso?
• Na maioria dos casos, completamente inofensivo.
• PORÉM em ~10–15% dos casos pode causar rasgo retiniano, que sem tratamento pode levar a descolamento de retina.
• Flashes e moscas volantes NOVOS sempre precisam exame imediato.

O Que Esperar
• Sem rasgo: Não precisa tratamento. Sintomas melhoram com o tempo.
• Com rasgo: Tratado com laser (fotocoagulação) ou congelamento (criopexia) no consultório.

Convivendo com Moscas Volantes
• São incômodas mas inofensivas. A maioria percebe menos com o tempo.
• Mais visíveis contra fundos claros.
• Não há vitaminas ou colírios que as eliminem.
• Em casos raros muito debilitantes, existem opções cirúrgicas.

Quando Ligar Imediatamente
• Surgimento súbito de muitas moscas volantes novas.
• Flashes de luz novos ou persistentes.
• Sombra na visão periférica (lateral).
• Cortina cinza cobrindo parte da visão.
• Qualquer perda súbita de visão.
Podem ser sintomas de rasgo ou descolamento de retina — precisam avaliação no mesmo dia.`
    }
  },
  {
    id: "cond-retinal-tear",
    category: "condition",
    title: { en: "Retinal Tear", es: "Desgarro Retiniano", vi: "Rách Võng Mạc", pt: "Rasgo Retiniano" },
    tags: ["retinal tear", "torn retina", "laser", "cryopexy"],
    content: {
      en: `RETINAL TEAR

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is a Retinal Tear?
Think of the retina as wallpaper lining the inside of your eye. A retinal tear is a rip in that wallpaper. If fluid passes through the rip and gets underneath, it can pull the wallpaper away from the wall — this is called a retinal detachment, a serious condition that can lead to vision loss. A retinal tear must be treated right away to prevent this from happening.

How Does a Retinal Tear Happen?
As we get older, the vitreous in our eyes starts to shrink and pull away from the back lining of the eye, where the retina is. This is called a posterior vitreous detachment (PVD). A PVD can happen without any other consequences, but sometimes the vitreous may stick to the retina and pull hard enough to cause a tear. When that happens, fluid can pass through the tear and lift the retina away from the wall — a retinal detachment. Flashes of light or floaters may occur during a PVD, a retinal tear, or a retinal detachment, and the only way to tell the difference is by having a thorough eye examination.

Who Is at Risk?
You are more likely to have a retinal tear if you:
• Are nearsighted (need glasses to see far away).
• Have had previous cataract, glaucoma, or other eye surgery.
• Take glaucoma medications that make the pupil small (like pilocarpine).
• Have had a serious eye injury.
• Have a retinal tear or detachment in the other eye.
• Have family members with retinal detachment.
• Have weak areas in the retina called lattice degeneration (which your ophthalmologist may see during an exam).

Early Signs of a Retinal Tear
A retinal tear must be evaluated by an ophthalmologist right away. The most common warning signs are sudden flashes of light, a shower of new floaters, or a shadow or curtain in your vision. See the alert box below for the full list of symptoms that require immediate attention.

How Is It Diagnosed?
Your ophthalmologist will put drops in your eye to dilate (widen) the pupil, then will look through a special lens to examine the retina. In many cases, the doctor will also perform scleral depression — gently pressing on the outside of your eyelid with a small instrument to bring the far edges of the retina into view. This can feel uncomfortable, but it is necessary because retinal tears often occur in the periphery where they are difficult to see otherwise. Retinal photos may sometimes capture a tear, but many tears are located outside the camera's field of view, which is why a thorough dilated exam with scleral depression is so important.

[IMAGE:retinal-tear-before|Before Treatment] [IMAGE:retinal-tear-after|After Treatment]

How Is It Treated?
There are two ways your eye surgeon may fix your retinal tear:
• Photocoagulation (laser): A laser is used to seal the retina to the wall of the eye. The goal is to keep fluid from going through the tear and detaching the retina. The procedure usually takes less than 15 minutes and may be done right in your doctor's office. The laser makes tiny burns that form scars to seal the retina to the eye wall.
• Cryopexy (freezing): Extreme cold is used to seal the retina to the wall of the eye. The goal is the same — to keep fluid from going through the tear. This procedure usually takes less than 30 minutes. The surgeon uses a special probe that delivers intense cold energy to the retina, freezing the retina around the tear and creating scar tissue that seals the retina.

Treatment Risks
Like any procedure, retinal tear intervention has some risks, including bleeding in your eye, vision loss, the possibility that the tear does not fully seal or that the retina detaches even after the procedure, and the chance of developing new tears in the future.

What to Expect Afterward
• You might have some discomfort for a few hours after the procedure. Over-the-counter pain medication can help.
• After laser, you may see various colors for a while because of the bright lights, but this should get better within a few hours.
• The flashes or floaters may persist despite treatment.

When to Call Right Away
Contact your eye doctor immediately if you experience:
• Sudden flashing lights.
• A sudden shower of many new floaters.
• A shadow in your peripheral (side) vision.
• A gray curtain covering part of your vision.
• Sudden vision loss.
These may be signs of a retinal tear or detachment, a serious problem that needs prompt attention.`,

      es: `DESGARRO RETINIANO

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es un Desgarro Retiniano?
Piense en la retina como el papel tapiz que recubre el interior de su ojo. Un desgarro retiniano es una rotura en ese papel tapiz. Si el líquido pasa a través de la rotura y se mete debajo, puede despegar el papel tapiz de la pared — esto se llama desprendimiento de retina, una condición seria que puede causar pérdida de visión. Un desgarro retiniano debe tratarse de inmediato para prevenir que esto ocurra.

¿Cómo Ocurre?
Con la edad, el vítreo se encoge y se separa de la parte posterior del ojo, donde está la retina. Esto se llama desprendimiento vítreo posterior (DVP). Un DVP puede ocurrir sin otras consecuencias, pero a veces el vítreo puede adherirse a la retina y tirar lo suficiente para causar un desgarro. Cuando eso sucede, el líquido puede pasar por el desgarro y levantar la retina de la pared — un desprendimiento de retina. Los destellos de luz o moscas volantes pueden ocurrir durante un DVP, un desgarro retiniano, o un desprendimiento de retina, y la única manera de distinguir entre ellos es con un examen ocular completo.

¿Quién Está en Riesgo?
• Miopes (necesitan gafas para ver de lejos).
• Cirugía previa de catarata, glaucoma u otra cirugía ocular.
• Medicamentos de glaucoma que achican la pupila (como pilocarpina).
• Lesión ocular seria.
• Desgarro o desprendimiento de retina en el otro ojo.
• Familiares con desprendimiento de retina.
• Áreas débiles en la retina llamadas degeneración lattice (que su oftalmólogo puede ver durante un examen).

Señales Tempranas de un Desgarro Retiniano
Un desgarro retiniano debe ser evaluado por un oftalmólogo de inmediato. Las señales de alerta más comunes son destellos súbitos de luz, una lluvia de moscas volantes nuevas, o una sombra o cortina en su visión. Vea el recuadro de alerta abajo para la lista completa de síntomas que requieren atención inmediata.

¿Cómo Se Diagnostica?
Su oftalmólogo le pondrá gotas para dilatar (agrandar) la pupila, y luego usará un lente especial para examinar la retina. En muchos casos, el médico también realizará depresión escleral — presionando suavemente en el exterior de su párpado con un instrumento pequeño para ver los bordes lejanos de la retina. Esto puede ser incómodo, pero es necesario porque los desgarros retinianos frecuentemente ocurren en la periferia donde son difíciles de ver. Las fotos de retina a veces pueden capturar un desgarro, pero muchos desgarros están fuera del campo de visión de la cámara, por eso un examen dilatado con depresión escleral es tan importante.

[IMAGE:retinal-tear-before|Antes del Tratamiento] [IMAGE:retinal-tear-after|Después del Tratamiento]

Tratamiento
Hay dos maneras en que su cirujano puede reparar su desgarro retiniano:
• Fotocoagulación (láser): Un láser sella la retina a la pared del ojo. El objetivo es evitar que el líquido pase por el desgarro y desprenda la retina. El procedimiento toma menos de 15 minutos y puede hacerse en el consultorio. El láser hace quemaduras diminutas que forman cicatrices para sellar la retina.
• Criopexia (congelamiento): Frío extremo sella la retina a la pared del ojo. El objetivo es el mismo — evitar que el líquido pase por el desgarro. Este procedimiento toma menos de 30 minutos.

Riesgos
Como cualquier procedimiento, la intervención tiene algunos riesgos, incluyendo sangrado en el ojo, pérdida de visión, la posibilidad de que el desgarro no selle completamente o que la retina se desprenda aún después del procedimiento, y la posibilidad de desarrollar nuevos desgarros en el futuro.

Qué Esperar Después
• Puede tener algo de molestia por unas horas después del procedimiento. Medicamentos de venta libre pueden ayudar.
• Después del láser, puede ver varios colores por un rato debido a las luces brillantes, pero esto debería mejorar en unas horas.
• Los destellos o moscas volantes pueden persistir a pesar del tratamiento.

Cuándo Llamar de Inmediato
• Destellos de luz súbitos.
• Aparición súbita de muchas moscas volantes nuevas.
• Sombra en la visión periférica.
• Cortina gris en la visión.
• Pérdida súbita de visión.
Estos pueden ser signos de desgarro o desprendimiento de retina, un problema serio que necesita atención inmediata.`,

      vi: `RÁCH VÕNG MẠC

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Rách Võng Mạc Là Gì?
Hãy nghĩ về võng mạc như giấy dán tường lót bên trong mắt. Rách võng mạc là một vết rách trên lớp giấy dán tường đó. Nếu dịch chui qua vết rách và lọt vào bên dưới, nó có thể kéo giấy dán tường ra khỏi tường — đây gọi là bong võng mạc, một tình trạng nghiêm trọng có thể gây mất thị lực. Rách võng mạc phải được điều trị ngay để ngăn điều này xảy ra.

Rách Võng Mạc Xảy Ra Như Thế Nào?
Khi già đi, dịch kính co lại và tách khỏi phần sau mắt, nơi có võng mạc. Đây gọi là bong dịch kính sau (PVD). PVD có thể xảy ra mà không có hậu quả gì, nhưng đôi khi dịch kính có thể dính vào võng mạc và kéo đủ mạnh để gây rách. Khi đó, dịch có thể chui qua vết rách và nâng võng mạc khỏi thành mắt — bong võng mạc. Chớp sáng hoặc ruồi bay có thể xảy ra trong PVD, rách võng mạc, hoặc bong võng mạc, và cách duy nhất để phân biệt là khám mắt kỹ lưỡng.

Ai Có Nguy Cơ?
• Cận thị (cần kính để nhìn xa).
• Đã phẫu thuật đục thủy tinh thể, glaucoma, hoặc phẫu thuật mắt khác.
• Dùng thuốc glaucoma làm co đồng tử (như pilocarpine).
• Chấn thương mắt nặng.
• Rách hoặc bong võng mạc ở mắt kia.
• Gia đình có người bị bong võng mạc.
• Có vùng yếu trên võng mạc gọi là thoái hóa lattice (bác sĩ có thể thấy khi khám).

Dấu Hiệu Sớm của Rách Võng Mạc
Rách võng mạc phải được bác sĩ mắt đánh giá ngay. Các dấu hiệu cảnh báo phổ biến nhất là chớp sáng đột ngột, nhiều ruồi bay mới, hoặc bóng hay màn che trong tầm nhìn. Xem khung cảnh báo bên dưới để biết danh sách đầy đủ các triệu chứng cần chú ý ngay.

Chẩn Đoán Như Thế Nào?
Bác sĩ sẽ nhỏ thuốc giãn đồng tử, rồi dùng kính đặc biệt để khám võng mạc. Trong nhiều trường hợp, bác sĩ cũng sẽ thực hiện ấn củng mạc — nhẹ nhàng ấn bên ngoài mí mắt bằng dụng cụ nhỏ để thấy rõ các rìa xa của võng mạc. Điều này có thể khó chịu, nhưng cần thiết vì rách võng mạc thường xảy ra ở vùng ngoại vi, nơi khó nhìn thấy. Ảnh chụp võng mạc đôi khi có thể bắt được vết rách, nhưng nhiều vết rách nằm ngoài trường nhìn của máy ảnh, vì vậy khám giãn đồng tử kỹ lưỡng với ấn củng mạc rất quan trọng.

[IMAGE:retinal-tear-before|Trước Điều Trị] [IMAGE:retinal-tear-after|Sau Điều Trị]

Điều Trị Như Thế Nào?
Có hai cách bác sĩ có thể sửa vết rách võng mạc:
• Quang đông (laser): Laser gắn võng mạc vào thành mắt. Mục tiêu là ngăn dịch chui qua vết rách và bong võng mạc. Thủ thuật mất dưới 15 phút và có thể thực hiện tại phòng khám. Laser tạo vết bỏng nhỏ thành sẹo để gắn chặt võng mạc.
• Đông lạnh (cryopexy): Lạnh cực độ gắn võng mạc vào thành mắt. Mục tiêu giống nhau — ngăn dịch chui qua vết rách. Thủ thuật này mất dưới 30 phút.

Rủi Ro
Như bất kỳ thủ thuật nào, can thiệp rách võng mạc có một số rủi ro, bao gồm chảy máu trong mắt, mất thị lực, khả năng vết rách không kín hoàn toàn hoặc võng mạc bong ngay cả sau thủ thuật, và khả năng phát triển vết rách mới trong tương lai.

Sau Thủ Thuật
• Có thể khó chịu vài giờ sau thủ thuật. Thuốc giảm đau không kê đơn có thể giúp.
• Sau laser, bạn có thể thấy nhiều màu sắc do ánh sáng mạnh, nhưng sẽ cải thiện trong vài giờ.
• Chớp sáng hoặc ruồi bay có thể vẫn còn dù đã điều trị.

Khi Nào Cần Gọi Ngay
• Chớp sáng đột ngột.
• Nhiều ruồi bay mới đột ngột.
• Bóng ở tầm nhìn ngoại vi.
• Màn xám che tầm nhìn.
• Mất thị lực đột ngột.
Đây có thể là dấu hiệu rách hoặc bong võng mạc, một vấn đề nghiêm trọng cần được chú ý ngay.`,

      pt: `RASGO RETINIANO

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É um Rasgo Retiniano?
Pense na retina como o papel de parede que reveste o interior do seu olho. Um rasgo retiniano é uma ruptura nesse papel de parede. Se o fluido passar pela ruptura e entrar por baixo, pode descolar o papel de parede da parede — isso é chamado de descolamento de retina, uma condição séria que pode causar perda de visão. Um rasgo retiniano deve ser tratado imediatamente para prevenir que isso aconteça.

Como Acontece?
Com a idade, o vítreo encolhe e se separa da parte posterior do olho, onde está a retina. Isso é chamado de descolamento vítreo posterior (DVP). Um DVP pode acontecer sem outras consequências, mas às vezes o vítreo pode aderir à retina e puxar o suficiente para causar um rasgo. Quando isso acontece, o fluido pode passar pelo rasgo e levantar a retina da parede — um descolamento de retina. Flashes de luz ou moscas volantes podem ocorrer durante um DVP, um rasgo retiniano, ou um descolamento de retina, e a única maneira de distinguir entre eles é com um exame ocular completo.

Quem Tem Risco?
• Míopes (precisam de óculos para ver de longe).
• Cirurgia prévia de catarata, glaucoma ou outra cirurgia ocular.
• Medicamentos de glaucoma que diminuem a pupila (como pilocarpina).
• Lesão ocular grave.
• Rasgo ou descolamento de retina no outro olho.
• Familiares com descolamento de retina.
• Áreas fracas na retina chamadas degeneração lattice (que seu oftalmologista pode ver durante um exame).

Sinais Precoces de um Rasgo Retiniano
Um rasgo retiniano deve ser avaliado por um oftalmologista imediatamente. Os sinais de alerta mais comuns são flashes súbitos de luz, uma chuva de moscas volantes novas, ou uma sombra ou cortina na sua visão. Veja o quadro de alerta abaixo para a lista completa de sintomas que requerem atenção imediata.

Como É Diagnosticado?
Seu oftalmologista colocará colírios para dilatar (alargar) a pupila, e então usará uma lente especial para examinar a retina. Em muitos casos, o médico também realizará depressão escleral — pressionando suavemente a parte externa da pálpebra com um instrumento pequeno para ver as bordas distantes da retina. Isso pode ser desconfortável, mas é necessário porque rasgos retinianos frequentemente ocorrem na periferia, onde são difíceis de ver. Fotos da retina às vezes podem capturar um rasgo, mas muitos rasgos estão fora do campo de visão da câmera, por isso um exame dilatado completo com depressão escleral é tão importante.

[IMAGE:retinal-tear-before|Antes do Tratamento] [IMAGE:retinal-tear-after|Após o Tratamento]

Tratamento
Há duas maneiras de seu cirurgião reparar o rasgo retiniano:
• Fotocoagulação (laser): Um laser sela a retina à parede do olho. O objetivo é evitar que o fluido passe pelo rasgo e descole a retina. O procedimento leva menos de 15 minutos e pode ser feito no consultório. O laser faz queimaduras diminutas que formam cicatrizes para selar a retina.
• Criopexia (congelamento): Frio extremo sela a retina à parede do olho. O objetivo é o mesmo — evitar que o fluido passe pelo rasgo. Este procedimento leva menos de 30 minutos.

Riscos
Como qualquer procedimento, a intervenção tem alguns riscos, incluindo sangramento no olho, perda de visão, a possibilidade de o rasgo não selar completamente ou de a retina descolar mesmo após o procedimento, e a chance de desenvolver novos rasgos no futuro.

O Que Esperar Depois
• Pode ter algum desconforto por algumas horas após o procedimento. Analgésicos de venda livre podem ajudar.
• Após o laser, pode ver várias cores por um tempo devido às luzes brilhantes, mas isso deve melhorar em algumas horas.
• Os flashes ou moscas volantes podem persistir apesar do tratamento.

Quando Ligar Imediatamente
• Flashes de luz súbitos.
• Surgimento súbito de muitas moscas volantes novas.
• Sombra na visão periférica.
• Cortina cinza na visão.
• Perda súbita de visão.
Estes podem ser sinais de rasgo ou descolamento de retina, um problema sério que precisa de atenção imediata.`
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

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is It?
A macular pucker happens when wrinkles, creases, or bulges form on your macula. The macula must lie flat against the back of your eye to work properly. When the macula wrinkles or bulges, your central vision may be affected. Things can look wavy, or you may have trouble seeing details. You might notice a gray, cloudy, or blank area in your central vision, or even double vision in the affected eye. A macular pucker doesn't usually affect your peripheral (side) vision.

[IMAGE_PAIR:erm-oct-before|Before Surgery (ERM)|erm-oct-after|After Surgery (Membrane Peeled)|OCT cross-section showing wrinkled macula before and flat macula after membrane peel surgery.]

What Causes It?
Age is the most common cause. As you get older, the vitreous begins to shrink and pull away from the retina. Usually this happens with no problems. But sometimes the vitreous can stick to the retina and scar tissue forms, causing the retina and macula to wrinkle or bulge. Other causes include previous eye surgery, retinal tears or detachment, swelling inside the eye (inflammation), previous injury, or problems with blood vessels in the retina.

Symptoms
• Blurry or distorted central vision.
• Straight lines look wavy or crooked (metamorphopsia).
• A gray, cloudy, or blank area in the center of your vision.
• Difficulty reading small print or seeing fine details.
• Mild cases may have no symptoms at all (found during a routine eye exam).

How Is It Diagnosed?
• Dilated eye exam — drops are placed to widen your pupils so the doctor can see the retina clearly through a special lens.
• OCT (Optical Coherence Tomography) — a painless scan that produces very detailed cross-section pictures of the retina and macula, showing whether the surface is wrinkled or thickened.

Treatment
Treatment depends on your symptoms.
• Mild cases: If your symptoms are mild, you might not need any treatment. Your doctor may update your glasses or contact lens prescription to improve your vision. Eye drops, medicine, and laser surgery do not help macular pucker.
• Surgery (vitrectomy with membrane peel): If your symptoms are more serious, your doctor may recommend a surgery called vitrectomy. The surgeon removes some of the vitreous and carefully peels the scar tissue off the macula. This flattens the macula, returning it to its proper position. Vision usually improves slowly over weeks to months. However, even after surgery, your sight may not be as good as it was before the macular pucker.

Surgery Risks
Like all surgery, vitrectomy has some risks, including eye infection, bleeding in the eye, retinal detachment, the macular pucker coming back (recurrence), increased eye pressure, vision loss, and cataract (the lens in your eye becoming cloudy, which may need surgery later).

When to Call Right Away
Contact your eye doctor immediately if you experience:
• Sudden increase in blurry or distorted vision.
• New wavy or crooked lines in your vision.
• A dark shadow or curtain covering part of your vision.
• Severe eye pain with redness.
• Sudden, severe vision loss.`,

      es: `MEMBRANA EPIRRETINIANA (ARRUGA MACULAR)

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es?
Ocurre cuando arrugas o pliegues se forman en la mácula. La mácula debe estar plana contra la parte posterior del ojo para funcionar correctamente. Cuando se arruga, la visión central se ve afectada. Las cosas pueden verse onduladas, o puede tener dificultad para ver detalles. Puede notar un área gris, nublada o en blanco en su visión central. No afecta la visión periférica (lateral).

[IMAGE_PAIR:erm-oct-before|Antes de Cirugía (MER)|erm-oct-after|Después de Cirugía (Membrana Pelada)|OCT mostrando mácula arrugada antes y plana después de cirugía de pelado de membrana.]

¿Qué la Causa?
El envejecimiento es la causa más común. Con la edad, el vítreo se encoge y se separa de la retina. A veces puede adherirse y formar tejido cicatricial, causando arrugas en la mácula. Otras causas incluyen cirugía ocular previa, desgarros retinianos, inflamación o lesiones.

Síntomas
• Visión central borrosa o distorsionada.
• Las líneas rectas se ven onduladas o torcidas.
• Área gris, nublada o en blanco en el centro de su visión.
• Dificultad para leer letra pequeña o ver detalles finos.
• Casos leves pueden no tener síntomas.

¿Cómo Se Diagnostica?
• Examen con dilatación — gotas para agrandar las pupilas y ver la retina.
• OCT — escaneo indoloro que muestra si la superficie de la mácula está arrugada o engrosada.

Tratamiento
• Casos leves: Puede no necesitar tratamiento. Su médico puede actualizar su receta de lentes. Gotas, medicinas y láser no ayudan.
• Cirugía (vitrectomía con pelado de membrana): Si los síntomas son serios, el cirujano remueve el vítreo y pela el tejido cicatricial. La visión mejora lentamente en semanas a meses, pero puede no ser tan buena como antes.

Riesgos de la Cirugía
Infección ocular, sangrado, desprendimiento de retina, recurrencia de la membrana, aumento de presión ocular, pérdida de visión y catarata.

Cuándo Llamar de Inmediato
• Aumento súbito de visión borrosa o distorsionada.
• Líneas onduladas o torcidas nuevas.
• Sombra oscura o cortina cubriendo parte de su visión.
• Dolor ocular severo con enrojecimiento.
• Pérdida severa y súbita de visión.`,

      vi: `MÀNG TRƯỚC VÕNG MẠC (NHĂN HOÀNG ĐIỂM)

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Là Gì?
Nhăn hoàng điểm xảy ra khi nếp nhăn hoặc nếp gấp hình thành trên hoàng điểm. Hoàng điểm cần nằm phẳng để hoạt động đúng. Khi bị nhăn, thị lực trung tâm bị ảnh hưởng. Bạn có thể thấy mọi thứ lượn sóng hoặc khó nhìn chi tiết. Không ảnh hưởng thị lực ngoại vi.

[IMAGE_PAIR:erm-oct-before|Trước Phẫu Thuật (ERM)|erm-oct-after|Sau Phẫu Thuật (Bóc Màng)|OCT cho thấy hoàng điểm nhăn trước và phẳng sau phẫu thuật bóc màng.]

Nguyên Nhân
Tuổi tác là nguyên nhân phổ biến nhất. Dịch kính co lại và tách khỏi võng mạc, đôi khi dính và tạo mô sẹo gây nhăn. Các nguyên nhân khác: phẫu thuật mắt trước đó, rách võng mạc, viêm, chấn thương.

Triệu Chứng
• Mờ hoặc méo thị lực trung tâm.
• Đường thẳng trông lượn sóng hoặc cong.
• Vùng xám, mờ đục trong trung tâm tầm nhìn.
• Khó đọc chữ nhỏ hoặc nhìn chi tiết.
• Trường hợp nhẹ có thể không có triệu chứng.

Chẩn Đoán
• Khám mắt có giãn đồng tử — nhỏ thuốc giãn đồng tử để bác sĩ nhìn rõ võng mạc.
• OCT — quét không đau cho thấy bề mặt hoàng điểm có nhăn hay dày không.

Điều Trị
• Nhẹ: Có thể không cần điều trị. Bác sĩ có thể cập nhật kính. Thuốc nhỏ mắt và laser không hiệu quả.
• Phẫu thuật (cắt dịch kính và bóc màng): Bác sĩ loại bỏ dịch kính và bóc mô sẹo. Thị lực cải thiện chậm trong vài tuần đến tháng.

Rủi Ro Phẫu Thuật
Nhiễm trùng, chảy máu, bong võng mạc, tái phát màng, tăng nhãn áp, mất thị lực và đục thủy tinh thể.

Khi Nào Cần Gọi Ngay
• Mờ hoặc méo thị lực tăng đột ngột.
• Đường lượn sóng hoặc cong mới.
• Bóng tối hoặc màn che một phần tầm nhìn.
• Đau mắt dữ dội kèm đỏ.
• Mất thị lực nặng và đột ngột.`,

      pt: `MEMBRANA EPIRRETINIANA (ENRUGAMENTO MACULAR)

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É?
Ocorre quando rugas ou pregas se formam na mácula. A mácula precisa estar plana para funcionar corretamente. Quando enruga, a visão central é afetada. As coisas podem parecer onduladas, ou pode ter dificuldade em ver detalhes. Pode notar uma área cinza, turva ou em branco na visão central. Não afeta a visão periférica (lateral).

[IMAGE_PAIR:erm-oct-before|Antes da Cirurgia (MER)|erm-oct-after|Após Cirurgia (Membrana Removida)|OCT mostrando mácula enrugada antes e plana após cirurgia de remoção de membrana.]

O Que Causa?
O envelhecimento é a causa mais comum. Com a idade, o vítreo encolhe e se separa da retina. Às vezes pode aderir e formar tecido cicatricial, causando rugas na mácula. Outras causas incluem cirurgia ocular prévia, rasgos retinianos, inflamação ou lesões.

Sintomas
• Visão central embaçada ou distorcida.
• Linhas retas parecem onduladas ou tortas.
• Área cinza, turva ou em branco no centro da visão.
• Dificuldade para ler letras pequenas ou ver detalhes finos.
• Casos leves podem não ter sintomas.

Como É Diagnosticada?
• Exame com dilatação — colírios para dilatar as pupilas e ver a retina.
• OCT — exame indolor que mostra se a superfície da mácula está enrugada ou espessada.

Tratamento
• Casos leves: Pode não precisar de tratamento. O médico pode atualizar a receita de óculos. Colírios, medicamentos e laser não ajudam.
• Cirurgia (vitrectomia com remoção de membrana): O cirurgião remove o vítreo e retira o tecido cicatricial. A visão melhora lentamente em semanas a meses, mas pode não ser tão boa quanto antes.

Riscos da Cirurgia
Infecção ocular, sangramento, descolamento de retina, recorrência da membrana, aumento da pressão ocular, perda de visão e catarata.

Quando Ligar Imediatamente
• Aumento súbito de visão embaçada ou distorcida.
• Linhas onduladas ou tortas novas.
• Sombra escura ou cortina cobrindo parte da visão.
• Dor ocular severa com vermelhidão.
• Perda severa e súbita de visão.`
    }
  },
  {
    id: "cond-macular-hole",
    category: "condition",
    title: { en: "Macular Hole", es: "Agujero Macular", vi: "Lỗ Hoàng Điểm", pt: "Buraco Macular" },
    tags: ["macular hole", "surgery", "face-down"],
    content: {
      en: `MACULAR HOLE

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is It?
A macular hole is when a tear or opening forms in your macula. As the hole forms, things in your central vision will look blurry, wavy, or distorted. As the hole grows, a dark or blind spot appears in your central vision. A macular hole usually affects only your central vision. Rarely, it may lead to a retinal detachment, which can also affect your peripheral (side) vision.

[IMAGE_PAIR:mh-oct-before|Before Surgery (Macular Hole)|mh-oct-after|After Surgery (Hole Closed)|OCT cross-section showing open macular hole before surgery and closed hole after vitrectomy with gas bubble.]

What Causes It?
Age is the most common cause. As you get older, the vitreous begins to shrink and pull away from the retina. Usually this happens with no problems. But sometimes the vitreous can stick to the macula and stretch it, causing a hole to form. A macular hole can also form when the macula swells from other eye disease, or it can be caused by an eye injury.

Symptoms
• Blurry, wavy, or distorted central vision.
• A dark or blind spot in the center of your vision that grows over time.
• Difficulty reading, recognizing faces, or seeing fine details.
• Straight lines look bent or wavy.

How Is It Diagnosed?
• Dilated eye exam — drops are placed to widen your pupils so the doctor can look through a special lens at the inside of your eye.
• OCT (Optical Coherence Tomography) — a painless scan that produces very detailed pictures of the retina and macula, clearly showing the hole.

Treatment
Surgery called vitrectomy is the best way to treat a macular hole. Your surgeon removes the vitreous that is pulling on your macula, then places a gas bubble inside the eye. This bubble pushes against the back of your eye, helping bring the edges of the hole close together so it can heal. That is why face-down positioning after surgery is so critical for its success. The gas bubble slowly goes away on its own and is replaced by fluid your eye naturally produces.

Things to Know About Surgery
• Your eye may hurt after surgery. Your surgeon will have you take medicine to help with pain.
• You will need to wear an eye patch for a short time. You will also need to put drops in your eye.
• You may be asked to keep your face down in a specific position for a period of time, depending on your surgeon's preference. This keeps the gas bubble in place to heal properly.
• You CANNOT fly in an airplane, go to mountains/high altitudes, or scuba dive until the gas bubble is gone. A rapid altitude change can make eye pressure rise dangerously.
• If you need to have any other type of surgery, be sure to tell your doctor before surgery that you have a gas bubble in your eye.
• Your vision may improve as the macular hole closes. It may take several months for the hole to finish healing. How much vision you get back depends on the size of your macular hole and how long it was there before surgery.

Surgery Risks
Like any surgery, vitrectomy has some risks, including eye infection, bleeding in the eye, retinal detachment, glaucoma (increased pressure inside the eye), vision loss, and cataract (the lens in your eye becoming cloudy).

Success Rate
• About 90–95% of macular holes close successfully with one surgery. Earlier treatment generally gives better visual results.

When to Call Right Away
Contact your eye doctor immediately if you experience:
• Sudden increase in blurry or distorted vision.
• A new or growing dark spot in your central vision.
• Flashes of light or a sudden increase in floaters.
• A dark shadow or curtain covering part of your vision.
• Severe eye pain with redness.`,

      es: `AGUJERO MACULAR

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es?
Un agujero macular es cuando se forma una abertura en la mácula. La visión central se vuelve borrosa, ondulada o distorsionada. A medida que el agujero crece, aparece un punto oscuro o ciego en la visión central. Generalmente solo afecta la visión central. En casos raros, puede llevar a un desprendimiento de retina, que también puede afectar la visión periférica (lateral).

[IMAGE_PAIR:mh-oct-before|Antes de Cirugía (Agujero)|mh-oct-after|Después de Cirugía (Cerrado)|OCT mostrando agujero macular abierto antes y cerrado después de vitrectomía.]

¿Qué lo Causa?
El envejecimiento es la causa más común. El vítreo se encoge y puede adherirse a la mácula y estirarla, formando un agujero. También puede formarse por hinchazón de otras enfermedades oculares o lesiones.

Síntomas
• Visión central borrosa, ondulada o distorsionada.
• Punto oscuro o ciego en el centro de la visión que crece con el tiempo.
• Dificultad para leer o reconocer caras.
• Líneas rectas se ven dobladas u onduladas.

¿Cómo Se Diagnostica?
• Examen con dilatación — gotas para ver el interior del ojo con lente especial.
• OCT — escaneo indoloro que muestra el agujero con claridad.

Tratamiento
Cirugía de vitrectomía: el cirujano remueve el vítreo y coloca una burbuja de gas. Esta burbuja empuja contra la parte posterior del ojo, ayudando a juntar los bordes del agujero para que pueda sanar. Por eso la posición boca abajo después de la cirugía es tan importante para su éxito. La burbuja se disuelve sola.
• Puede tener dolor — se recetarán medicamentos.
• Necesitará parche y gotas oculares.
• Puede necesitar posición boca abajo por un período de tiempo.
• NO puede volar, ir a altitudes altas, ni bucear hasta que la burbuja desaparezca (2–8 semanas).
• Informe a cualquier anestesiólogo sobre la burbuja de gas antes de otra cirugía.
• La visión mejora a medida que el agujero cierra, pero puede tomar varios meses.

Riesgos de Cirugía
Infección, sangrado, desprendimiento de retina, glaucoma, pérdida de visión y catarata.

Tasa de Éxito
• ~90–95% de cierre exitoso. Tratamiento temprano da mejores resultados visuales.

Cuándo Llamar de Inmediato
• Aumento súbito de visión borrosa o distorsionada.
• Punto oscuro nuevo o creciente en la visión central.
• Destellos de luz o aumento súbito de moscas volantes.
• Sombra oscura o cortina en su visión.
• Dolor ocular severo con enrojecimiento.`,

      vi: `LỖ HOÀNG ĐIỂM

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Là Gì?
Lỗ hoàng điểm là khi hình thành vết rách hoặc lỗ mở ở hoàng điểm. Thị lực trung tâm trở nên mờ, lượn sóng hoặc méo. Khi lỗ lớn hơn, xuất hiện đốm tối hoặc điểm mù. Thường chỉ ảnh hưởng thị lực trung tâm. Hiếm khi, có thể dẫn đến bong võng mạc, ảnh hưởng cả thị lực ngoại vi (bên).

[IMAGE_PAIR:mh-oct-before|Trước Phẫu Thuật (Lỗ Hoàng Điểm)|mh-oct-after|Sau Phẫu Thuật (Lỗ Đóng)|OCT cho thấy lỗ hoàng điểm mở trước và đóng sau phẫu thuật cắt dịch kính.]

Nguyên Nhân
Tuổi tác phổ biến nhất. Dịch kính co lại và có thể dính vào hoàng điểm, kéo căng tạo lỗ. Cũng có thể do phù từ bệnh mắt khác hoặc chấn thương.

Triệu Chứng
• Mờ, lượn sóng hoặc méo thị lực trung tâm.
• Đốm tối hoặc điểm mù ở trung tâm tầm nhìn, lớn dần theo thời gian.
• Khó đọc hoặc nhận diện khuôn mặt.
• Đường thẳng trông cong hoặc lượn sóng.

Chẩn Đoán
• Khám mắt có giãn đồng tử — nhỏ thuốc để nhìn rõ bên trong mắt.
• OCT — quét không đau cho thấy lỗ rõ ràng.

Điều Trị
Phẫu thuật cắt dịch kính: bác sĩ loại bỏ dịch kính và đặt bong bóng khí. Bong bóng này đẩy vào phía sau mắt, giúp kéo các mép lỗ lại gần nhau để lành. Đó là lý do tư thế úp mặt sau phẫu thuật rất quan trọng cho sự thành công. Bong bóng tự tan.
• Có thể đau — sẽ có thuốc giảm đau.
• Cần đeo miếng che mắt và nhỏ thuốc.
• Có thể cần tư thế úp mặt trong một thời gian.
• KHÔNG được bay, lên độ cao, hay lặn cho đến khi bong bóng tan (2–8 tuần).
• Báo cho bác sĩ gây mê về bong bóng khí nếu cần phẫu thuật khác.
• Thị lực cải thiện khi lỗ đóng, có thể mất vài tháng.

Rủi Ro Phẫu Thuật
Nhiễm trùng, chảy máu, bong võng mạc, tăng nhãn áp, mất thị lực và đục thủy tinh thể.

Tỷ Lệ Thành Công
• ~90–95% đóng lỗ thành công. Điều trị sớm cho kết quả tốt hơn.

Khi Nào Cần Gọi Ngay
• Mờ hoặc méo thị lực tăng đột ngột.
• Đốm tối mới hoặc đang lớn ở trung tâm tầm nhìn.
• Chớp sáng hoặc tăng đột ngột ruồi bay.
• Bóng tối hoặc màn che một phần tầm nhìn.
• Đau mắt dữ dội kèm đỏ.`,

      pt: `BURACO MACULAR

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É?
Um buraco macular é quando uma abertura se forma na mácula. A visão central fica embaçada, ondulada ou distorcida. À medida que o buraco cresce, aparece um ponto escuro ou cego na visão central. Geralmente afeta apenas a visão central. Raramente, pode levar a um descolamento de retina, que também pode afetar a visão periférica (lateral).

[IMAGE_PAIR:mh-oct-before|Antes da Cirurgia (Buraco)|mh-oct-after|Após Cirurgia (Fechado)|OCT mostrando buraco macular aberto antes e fechado após vitrectomia.]

O Que Causa?
O envelhecimento é a causa mais comum. O vítreo encolhe e pode aderir à mácula e esticá-la, formando um buraco. Também pode se formar por inchaço de outras doenças oculares ou lesões.

Sintomas
• Visão central embaçada, ondulada ou distorcida.
• Ponto escuro ou cego no centro da visão que cresce com o tempo.
• Dificuldade para ler ou reconhecer rostos.
• Linhas retas parecem tortas ou onduladas.

Como É Diagnosticado?
• Exame com dilatação — colírios para ver o interior do olho com lente especial.
• OCT — exame indolor que mostra o buraco com clareza.

Tratamento
Cirurgia de vitrectomia: o cirurgião remove o vítreo e coloca uma bolha de gás. Essa bolha empurra contra a parte de trás do olho, ajudando a juntar as bordas do buraco para que possa cicatrizar. Por isso o posicionamento de face para baixo após a cirurgia é tão importante para o sucesso. A bolha dissolve sozinha.
• Pode ter dor — medicamentos serão prescritos.
• Precisará de tampão ocular e colírios.
• Pode precisar ficar com a face para baixo por um período.
• NÃO pode voar, ir a altitudes elevadas, nem mergulhar até a bolha desaparecer (2–8 semanas).
• Informe qualquer anestesista sobre a bolha de gás antes de outra cirurgia.
• A visão melhora à medida que o buraco fecha, mas pode levar vários meses.

Riscos da Cirurgia
Infecção, sangramento, descolamento de retina, glaucoma, perda de visão e catarata.

Taxa de Sucesso
• ~90–95% de fechamento bem-sucedido. Tratamento precoce dá melhores resultados visuais.

Quando Ligar Imediatamente
• Aumento súbito de visão embaçada ou distorcida.
• Ponto escuro novo ou crescente na visão central.
• Flashes de luz ou aumento súbito de moscas volantes.
• Sombra escura ou cortina na visão.
• Dor ocular severa com vermelhidão.`
    }
  },
  {
    id: "cond-rd",
    category: "condition",
    title: { en: "Retinal Detachment", es: "Desprendimiento de Retina", vi: "Bong Võng Mạc", pt: "Descolamento de Retina" },
    tags: ["retinal detachment", "emergency", "flashes", "floaters", "surgery"],
    content: {
      en: `RETINAL DETACHMENT

[IMAGE:eye-anatomy|Figure 1: Anatomy of the Eye]

What Is It?
A retinal detachment occurs when the retina separates from the back wall of the eye. The affected area of vision becomes dark or blurred, and if the macula is involved, central vision loss can be significant. Without treatment, it almost always leads to permanent blindness. With early detection and modern surgery, the retina can often be successfully reattached.

[IMAGE_PAIR:rd-before|Before Surgery (Detachment)|rd-after|After Surgery (Reattached)|Fundus photographs from an actual case at Vitreo-Retinal Associates: large bullous retinal detachment with extensive retinal folds at presentation (left, VA hand motion), and fully reattached retina at post-operative month 2 (right).]

Risk Factors
• High myopia (severe nearsightedness).
• Previous detachment in either eye, or family history.
• Prior eye surgery (especially cataract) or eye trauma.
• Lattice degeneration, advanced diabetic retinopathy.
• Age over 50.

Symptoms
Retinal detachment is painless. The key signs are visual changes that develop suddenly:
• Floaters — sudden shower of new spots, cobwebs, or dark specks.
• Flashes of light — brief flashes or arcs, especially in peripheral vision.
• Shadow or curtain — a dark area that starts at the edge of vision and moves toward the center.
• Decreased vision — blurry or distorted vision, especially if the macula becomes involved.

How Is It Diagnosed?
A dilated fundus exam allows the doctor to examine the entire retina with specialized lenses. If the retina cannot be clearly seen (e.g., due to bleeding inside the eye), an ultrasound (B-scan) is used. OCT scans help assess whether the macula is attached.

Treatment
Retinal detachment almost always requires surgery. Approach depends on type, severity, and whether the macula is involved. Time is critical.
• Laser Retinopexy or Cryopexy — in-office sealing of a tear before the retina fully detaches.
• Pneumatic Retinopexy — gas bubble injected to press the tear back, sealed with laser.
• Pars Plana Vitrectomy — most common repair. Vitreous removed, retina flattened, laser applied. Gas bubble or silicone oil holds the retina during healing. Face-down positioning may be required.
• Scleral Buckle — silicone band sutured around the eye, indenting the wall to contact the detached retina.

Visual Recovery
Outcome depends on whether the macula was attached at surgery. Caught early (macula attached), most patients recover good central vision. If the macula was already detached, some permanent vision loss is common. With a gas bubble: no flying or scuba diving until it dissolves (2 to 8 weeks). Risks: infection, bleeding, re-detachment, glaucoma, cataract.

When to Call Right Away
Retinal detachment is a surgical emergency. Contact your eye doctor immediately if you experience:
• A sudden increase in floaters — especially dark spots or cobweb-like strands.
• Flashes of light in the affected eye.
• A shadow or dark curtain moving across your vision.
• A sudden, significant decrease in vision.`,

      es: `DESPRENDIMIENTO DE RETINA

[IMAGE:eye-anatomy|Figura 1: Anatomía del Ojo]

¿Qué Es?
Un desprendimiento de retina ocurre cuando la retina se separa de la pared posterior del ojo. El área afectada de la visión se vuelve oscura o borrosa, y si involucra la mácula, la pérdida de visión central puede ser significativa. Sin tratamiento, casi siempre lleva a ceguera permanente. Con detección temprana y cirugía moderna, la retina a menudo puede reposicionarse exitosamente.

[IMAGE_PAIR:rd-before|Antes de Cirugía (Desprendimiento)|rd-after|Después de Cirugía (Reposicionada)|Fotografías de fondo de un caso real en Vitreo-Retinal Associates: gran desprendimiento bulloso con pliegues retinianos al presentar (izquierda, visión de movimiento de mano), y retina completamente reposicionada al mes 2 post-operatorio (derecha).]

Factores de Riesgo
• Miopía alta, desprendimiento previo o historia familiar.
• Cirugía ocular previa (especialmente catarata) o trauma ocular.
• Degeneración en empalizada, retinopatía diabética avanzada, edad mayor de 50.

Síntomas
El desprendimiento es indoloro. Las señales clave son cambios visuales súbitos:
• Moscas volantes — aumento súbito de puntos, telarañas o motas oscuras.
• Destellos de luz — breves o arcos, especialmente en visión periférica.
• Sombra o cortina — área oscura desde el borde que avanza hacia el centro.
• Visión disminuida — borrosa o distorsionada, especialmente si la mácula se involucra.

¿Cómo Se Diagnostica?
Examen de fondo con dilatación con lentes especializados. Si la retina no se ve (sangrado en el ojo), se usa ultrasonido. El OCT evalúa si la mácula está adherida.

Tratamiento
El desprendimiento casi siempre requiere cirugía. El enfoque depende del tipo, severidad, y si la mácula está involucrada. El tiempo es crítico.
• Retinopexia con Láser o Crioterapia — en consultorio, para sellar un desgarro antes del desprendimiento completo.
• Retinopexia Neumática — burbuja de gas inyectada para presionar el desgarro, sellado con láser.
• Vitrectomía Pars Plana — la reparación más común. Se remueve el gel vítreo, se aplana la retina y se aplica láser. Burbuja de gas o aceite de silicón mantiene la retina durante la cicatrización. Puede requerir posición boca abajo.
• Cerclaje Escleral — banda de silicón suturada alrededor del ojo, indentando la pared para contactar la retina desprendida.

Recuperación Visual
El resultado depende de si la mácula estaba adherida al momento de la cirugía. Detectado temprano (mácula adherida), la mayoría recupera buena visión central. Si la mácula ya estaba desprendida, cierta pérdida visual permanente es común. Con burbuja de gas: no volar ni bucear hasta que se disuelva (2 a 8 semanas). Riesgos: infección, sangrado, re-desprendimiento, glaucoma, catarata.

Llame Inmediatamente
El desprendimiento de retina es una emergencia quirúrgica. Contacte a su oftalmólogo inmediatamente si experimenta:
• Aumento súbito de moscas volantes — especialmente puntos oscuros o telarañas.
• Destellos de luz en el ojo afectado.
• Sombra o cortina oscura que se mueve a través de su visión.
• Disminución súbita y significativa de la visión.`,

      vi: `BONG VÕNG MẠC

[IMAGE:eye-anatomy|Hình 1: Giải Phẫu Mắt]

Đây Là Gì?
Bong võng mạc xảy ra khi võng mạc tách khỏi thành sau của mắt. Vùng thị lực bị ảnh hưởng trở nên tối hoặc mờ, và nếu liên quan đến hoàng điểm, mất thị lực trung tâm có thể đáng kể. Không điều trị, gần như luôn dẫn đến mù vĩnh viễn. Với phát hiện sớm và phẫu thuật hiện đại, võng mạc thường có thể được gắn lại thành công.

[IMAGE_PAIR:rd-before|Trước Phẫu Thuật (Bong)|rd-after|Sau Phẫu Thuật (Đã Gắn Lại)|Ảnh đáy mắt từ ca thực tế tại Vitreo-Retinal Associates: bong võng mạc lớn với các nếp gấp khi đến khám (trái, thị lực đếm ngón tay), và võng mạc đã gắn lại hoàn toàn ở tháng thứ 2 sau phẫu thuật (phải).]

Yếu Tố Nguy Cơ
• Cận thị nặng.
• Đã từng bị bong võng mạc ở mắt nào, hoặc tiền sử gia đình.
• Phẫu thuật mắt trước đó (đặc biệt đục thủy tinh thể) hoặc chấn thương mắt.
• Thoái hóa dạng lưới, bệnh võng mạc tiểu đường tiến triển.
• Tuổi trên 50.

Triệu Chứng
Bong võng mạc không đau. Các dấu hiệu chính là thay đổi thị giác đột ngột:
• Đốm đen — đột ngột xuất hiện nhiều đốm đen mới, chấm, mạng nhện.
• Ánh sáng lóe — lóe sáng ngắn hoặc cung sáng, đặc biệt ở thị lực ngoại biên.
• Bóng hoặc màn che — vùng tối bắt đầu từ rìa thị lực và tiến vào trung tâm.
• Giảm thị lực — mờ hoặc méo, đặc biệt nếu hoàng điểm bị ảnh hưởng.

Chẩn Đoán
Khám đáy mắt giãn đồng tử cho phép bác sĩ khám toàn bộ võng mạc với thấu kính chuyên dụng. Nếu không thể nhìn rõ võng mạc (ví dụ do chảy máu trong mắt), dùng siêu âm (B-scan). OCT giúp đánh giá hoàng điểm còn dính hay không.

Điều Trị
Bong võng mạc gần như luôn cần phẫu thuật. Phương pháp phụ thuộc vào loại, mức độ, và hoàng điểm có liên quan hay không. Thời gian rất quan trọng.
• Laser hoặc đông lạnh — tại phòng khám, để niêm phong vết rách trước khi võng mạc bong hoàn toàn.
• Bơm khí võng mạc — bóng khí tiêm để ép vết rách, niêm phong bằng laser.
• Cắt dịch kính qua Pars Plana — phẫu thuật phổ biến nhất. Gel dịch kính được loại bỏ, võng mạc làm phẳng và laser áp dụng. Bóng khí hoặc dầu silicon giữ võng mạc trong khi lành. Có thể cần tư thế úp mặt.
• Đai củng mạc — dải silicon khâu quanh mắt, ấn thành mắt để tiếp xúc với võng mạc bị bong.

Phục Hồi Thị Lực
Kết quả phụ thuộc vào việc hoàng điểm còn dính khi phẫu thuật. Phát hiện sớm (hoàng điểm còn dính), đa số phục hồi thị lực trung tâm tốt. Nếu hoàng điểm đã bong, mất thị lực vĩnh viễn một phần là phổ biến. Với bóng khí: không đi máy bay hay lặn cho đến khi tan (2 đến 8 tuần). Rủi ro: nhiễm trùng, chảy máu, bong lại, glôcôm, đục thủy tinh thể.

Gọi Ngay
Bong võng mạc là cấp cứu phẫu thuật. Liên hệ bác sĩ mắt ngay nếu bạn gặp:
• Đột ngột tăng đốm đen — đặc biệt chấm tối hoặc mạng nhện.
• Lóe sáng ở mắt bị ảnh hưởng.
• Bóng hoặc màn tối di chuyển ngang qua tầm nhìn.
• Giảm thị lực đột ngột và đáng kể.`,

      pt: `DESCOLAMENTO DE RETINA

[IMAGE:eye-anatomy|Figura 1: Anatomia do Olho]

O Que É?
O descolamento de retina ocorre quando a retina se separa da parede posterior do olho. A área afetada da visão fica escura ou borrada, e se envolver a mácula, a perda de visão central pode ser significativa. Sem tratamento, quase sempre leva à cegueira permanente. Com detecção precoce e cirurgia moderna, a retina pode frequentemente ser reposicionada com sucesso.

[IMAGE_PAIR:rd-before|Antes da Cirurgia (Descolamento)|rd-after|Após Cirurgia (Reposicionada)|Fotografias de fundo de um caso real em Vitreo-Retinal Associates: grande descolamento bolhoso com pregas retinianas na apresentação (esquerda, visão de movimento de mão), e retina totalmente reposicionada no mês 2 pós-operatório (direita).]

Fatores de Risco
• Miopia alta, descolamento prévio ou história familiar.
• Cirurgia ocular prévia (especialmente catarata) ou trauma ocular.
• Degeneração em treliça, retinopatia diabética avançada, idade acima de 50.

Sintomas
O descolamento é indolor. Os principais sinais são mudanças visuais súbitas:
• Moscas volantes — aumento súbito de pontos, teias ou pintas escuras.
• Flashes de luz — breves ou arcos, especialmente na visão periférica.
• Sombra ou cortina — área escura desde a borda que avança para o centro.
• Visão diminuída — borrada ou distorcida, especialmente se a mácula for envolvida.

Como É Diagnosticado?
Exame de fundo com dilatação com lentes especializadas. Se a retina não puder ser vista (sangramento no olho), usa-se ultrassom. O OCT avalia se a mácula está aderida.

Tratamento
O descolamento quase sempre requer cirurgia. A abordagem depende do tipo, gravidade, e se a mácula está envolvida. O tempo é crítico.
• Retinopexia a Laser ou Crioterapia — em consultório, para selar um rasgo antes do descolamento completo.
• Retinopexia Pneumática — bolha de gás injetada para pressionar o rasgo, selada com laser.
• Vitrectomia Pars Plana — o reparo mais comum. Gel vítreo removido, retina aplanada, laser aplicado. Bolha de gás ou óleo de silicone mantém a retina durante a cicatrização. Pode requerer posição de cabeça para baixo.
• Faixa Escleral — faixa de silicone suturada ao redor do olho, indentando a parede para contatar a retina descolada.

Recuperação Visual
O resultado depende de se a mácula estava aderida na cirurgia. Detectado cedo, a maioria recupera boa visão. Mácula descolada, perda visual permanente é comum. Com bolha de gás: não voar nem mergulhar até desaparecer (2 a 8 semanas). Riscos: infecção, sangramento, re-descolamento, glaucoma, catarata.

Ligue Imediatamente
O descolamento de retina é uma emergência cirúrgica. Contate seu oftalmologista imediatamente se experimentar:
• Aumento súbito de moscas volantes — especialmente pontos escuros ou teias.
• Flashes de luz no olho afetado.
• Sombra ou cortina escura movendo-se através da visão.
• Diminuição súbita e significativa da visão.`
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

// ── API base ──────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "https://op-note-dictator-server-production.up.railway.app";

// ── Download PDF for one or more handouts ─────────────────────────
async function downloadHandoutPDF(handouts, lang) {
  const items = Array.isArray(handouts) ? handouts : [handouts];
  try {
    const payload = {
      handouts: items.map(h => ({
        title: h.title[lang] || h.title.en,
        content: h.content[lang] || h.content.en,
      })),
      lang,
    };
    const res = await fetch(`${API_BASE}/api/education-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("PDF generation failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = items.length === 1
      ? `${(items[0].title.en || "Handout").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`
      : "Patient_Education.pdf";
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("PDF download error:", e);
    // Fallback: basic print
    const content = items.map(h => (h.content[lang] || h.content.en)).join("\n\n---\n\n").replace(/\[PAGE_BREAK\]\n?/g, "").replace(/\[IMAGE[^\]]*\]\n?/g, "");
    const title = items[0].title[lang] || items[0].title.en;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; font-size: 13pt; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 13pt; line-height: 1.7; }
  @media print { body { margin: 0.5in; } }
</style></head><body>
<pre>${content}</pre>
<script>window.print();<\/script>
</body></html>`);
    win.document.close();
  }
}

// ── Component ──────────────────────────────────────────────────────
export default function PatientEducation({ onBack }) {
  const [view, setView] = useState("handouts"); // "handouts" or "drops"
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

  // If viewing Drop Schedule, render that component
  if (view === "drops") {
    return <DropSchedule onBack={() => setView("handouts")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid ${S.border}`, borderRadius: 8, padding: "6px 14px", color: S.muted, fontFamily: S.font, fontSize: "0.78rem", cursor: "pointer" }}>&larr; Home</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: S.bright }}>Patient Education Library</span>
        {/* Drop Schedule button */}
        <button
          onClick={() => setView("drops")}
          style={{ background: "linear-gradient(135deg,#059669,#10b981)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontFamily: S.font, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
        >
          Drop Schedule Builder
        </button>
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
                    {content.replace(/\[PAGE_BREAK\]\n?/g, "").replace(/\[IMAGE[^\]]*\]\n?/g, "")}
                  </pre>
                  <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                    <button
                      onClick={() => downloadHandoutPDF(h, lang)}
                      style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.8rem", fontFamily: S.font, fontWeight: 600, cursor: "pointer" }}
                    >
                      Download PDF ({lang.toUpperCase()})
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
