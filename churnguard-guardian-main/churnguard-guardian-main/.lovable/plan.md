
# ChurnGuard Dashboard — Plan

## Stack (Lovable-uyğunlaşdırılmış)
Next.js 14 əvəzinə **React 18 + Vite + React Router + TypeScript + Tailwind**. API route-lar əvəzinə **Lovable Cloud edge functions** (n8n webhook proxy üçün). Bütün funksionallıq eyni qalır.

## Səhifələr

### 1. Dashboard `/`
- **KPI kartları (üst sıra)**: Ümumi müştəri, Kritik risk sayı, Orta risk score, Son 7 gündə göndərilən kampaniyalar
- **Müştəri cədvəli**: ad, şirkət, segment, monthly_revenue, complaints, son alış, **risk score badge** (analiz olunmuşsa)
- Filter: segment, risk səviyyəsi (kritik/orta/aşağı/analiz olunmayıb), axtarış (ad/şirkət)
- Sıralama: risk score, monthly_revenue, complaints
- Sətirə klik → `/customer/[id]`
- "Hamısını analiz et" düyməsi (batch trigger, opsional)

### 2. Müştəri detalı `/customer/[id]`
- **Sol panel**: profil (ad, şirkət, email, telefon, segment, total_spent, complaints, complaint_texts list)
- **Sağ panel**:
  - "AI Analiz et" düyməsi → POST `/analyze` proxy
  - **Loading state**: 10–30 san. üçün animasiyalı progress (mərhələlər: "Müştəri datası yüklənir…" → "AI risk analizi…" → "Strategiya hazırlanır…")
  - Nəticə kartları: **Risk Score gauge** (0–100, rəng kodlu), **Analiz mətni**, **Reasons (chips)**, **Urgency badge**
  - **Strategiya kartı**: strategy_summary, offer_type, offer_value, follow_up_days, escalation badge
  - **Mesaj preview** (message_az) — düzəliş edilə bilən textarea
  - **Göndər paneli**: kanal seçimi (WhatsApp / Email / Both) + "Mesajı göndər" düyməsi → POST `/sendmessage`
  - Uğur toast-u: "Göndərildi ✓"

### 3. Kampaniyalar `/campaigns`
- Göndərilmiş mesajların cədvəli (n8n `results` sheet-dən): customer_name, channel, offer_value, strategy_summary, status, sent_at
- Filter: kanal, tarix aralığı, status
- Statistika: total sent, by channel breakdown (sadə bar chart)

## Backend (Lovable Cloud edge functions)

3 edge function — n8n webhook URL-ləri secret kimi:
- **`list-customers`** → n8n `/customers` webhook-una proxy (yeni n8n endpoint)
- **`analyze-customer`** → n8n `/analyze` proxy. Body: `{customer_id}`. Cavab: AI agent JSON-u
- **`send-message`** → n8n `/sendmessage` proxy. Body: `{customer_id, customer_name, customer_email, customer_phone, channel, message_az, strategy_summary, offer_value}`

Secret: `N8N_WEBHOOK_BASE_URL` (məs. `https://your-n8n.app/webhook`)

## n8n tərəfində lazım olan əlavələr (sənin işin)
1. Yeni workflow: **GET `/customers`** webhook → Get Customer Data (Sheets) → Respond JSON array
2. Mövcud `/analyze` webhook-u customer_id ilə filter edəcək şəkildə yenilə (hazırda bütün rows oxuyur)
3. n8n `Respond to Webhook` CORS header əlavə etsin və ya bütün çağırışları edge function arxasında saxlayacağıq (CORS problemi olmayacaq)

## Dizayn sistemi (Modern SaaS)
- Light theme, ağ background, **mavi primary** (#3B82F6 ailəsi), inter font
- Risk badges: kritik=qırmızı, yüksək=narıncı, orta=sarı, aşağı=yaşıl
- Sidebar naviqasiya (Dashboard / Müştərilər / Kampaniyalar)
- shadcn komponentləri: Table, Card, Badge, Dialog, Toast, Tabs, Progress
- Bütün UI mətnləri **Azərbaycan dilində**

## Data tipi (TypeScript)
```ts
type Customer = { customer_id, name, company, email, phone, segment, monthly_revenue, last_purchase_date, complaints, complaint_texts, total_spent }
type AIAnalysis = { risk_score, analysis, reasons[], urgency }
type Strategy = { strategy_summary, message_az, offer_type, offer_value, follow_up_days, escalation_needed }
type Campaign = { customer_id, customer_name, channel, offer_value, strategy_summary, status, sent_at }
```

## Implementation sırası
1. Lovable Cloud aktivləşdir + design system (colors, sidebar layout)
2. Edge functions (3 ədəd) + N8N_WEBHOOK_BASE_URL secret
3. Dashboard səhifəsi (cədvəl + KPI-lar)
4. Müştəri detalı (analiz axını + loading states + göndərmə)
5. Kampaniyalar səhifəsi
6. Polish: empty states, error handling, mobile responsive

**Qeyd**: Plan təsdiqlənəndən sonra n8n webhook URL-ni soruşacam (secret kimi). Həmçinin, n8n tərəfində `/customers` GET endpoint hazır olmasa, mock data ilə başlayacağıq və sən hazır olanda dəyişəcəyik.
