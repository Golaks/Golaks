# AI Chat Sistemi (GolaksIQ)

> **Modül:** GolaksIQ - Yapay Zeka Asistanı
> **Platform:** React Native + PHP Backend
> **Son Güncelleme:** 28 Ocak 2026

## Genel Bakış

GolaksIQ, Golaks yazılımları ve iş süreçleri konusunda kullanıcılara yardımcı olan bir yapay zeka asistanıdır. Sistem, çoklu AI sunucu desteği ve load balancing ile yüksek erişilebilirlik sağlar.

## Mimari

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AIChatScreen  │ --> │   AIController  │ --> │  AILoadBalancer │
│   (Frontend)    │     │   (Backend)     │     │   (Load Balancer)
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        │                               │                               │
                        ▼                               ▼                               ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
                │    OpenAI     │              │    Claude     │              │    Groq       │
                │    Server     │              │    Server     │              │    Server     │
                └───────────────┘              └───────────────┘              └───────────────┘
```

## Bileşenler

### 1. Frontend - AIChatScreen.tsx

**Konum:** `src/screens/AIChatScreen.tsx`

#### Özellikler
- Gerçek zamanlı sohbet arayüzü
- Typing animasyonu (3 nokta)
- Klavye uyumlu scroll davranışı
- Sohbeti temizleme
- Tüm mesajları kopyalama

#### State Yönetimi
```typescript
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}
```

#### Selamlama Sistemi
Saate göre dinamik selamlama:
- 06:00-12:00: "Günaydın"
- 12:00-18:00: "İyi öğlenler"
- 18:00-06:00: "İyi akşamlar"

### 2. AI Service

**Konum:** `src/services/ai.service.ts`

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

aiService.sendChatMessage(message: string, conversationHistory: ChatMessage[])
```

### 3. Backend - AIController.php

**Konum:** `api/controllers/AIController.php`

#### Endpoint'ler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/ai/chat` | AI'ya mesaj gönder |
| GET | `/ai/health` | Sunucu sağlık durumu |

#### Chat Request
```json
{
  "message": "Kullanıcı mesajı",
  "conversation_history": [...],
  "language": "tr"
}
```

#### Chat Response
```json
{
  "success": true,
  "data": {
    "message": "AI yanıtı",
    "language": "tr"
  }
}
```

### 4. Load Balancer - AILoadBalancer.php

**Konum:** `api/includes/AILoadBalancer.php`

#### Sunucu Seçim Kriterleri
1. **Başarı oranı** (basari_orani DESC)
2. **Yük durumu** (mevcut_yuk / maksimum_yuk ASC)
3. **Yanıt süresi** (ort_yanit_suresi ASC)

#### Desteklenen Sunucu Tipleri
- `openai` - OpenAI API (GPT modelleri)
- `claude` - Anthropic Claude API
- `groq` - Groq API
- `ollama` - Yerel Ollama sunucusu
- `golaks` - Özel Golaks sunucusu

#### Otomatik Devre Dışı Bırakma
- 5+ istek sonrası %20'nin altında başarı oranı
- Sunucu otomatik "bakım" moduna alınır

### 5. System Prompts - ChatSystemPrompts.php

**Konum:** `api/includes/ChatSystemPrompts.php`

#### Çok Dilli Destek
- Türkçe (`tr`)
- İngilizce (`en`)

#### Asistan Kişiliği
- Ad: "Golaks IQ"
- Rol: Yazılım asistanı
- Kapsam: Sadece Golaks yazılımları ve iş süreçleri

#### Kapsam İçi Konular
- Golaks yazılımları (muhasebe, stok, üretim, ERP, CRM)
- Muhasebe ve finans işlemleri
- Stok ve envanter yönetimi
- Üretim planlama ve takip
- Cari hesap işlemleri
- Fatura ve irsaliye işlemleri
- Raporlama ve analiz
- Teknik destek ve sorun giderme

#### Kapsam Dışı Konular
- Yemek tarifleri
- Şiir, hikaye, şarkı sözleri
- Genel kültür soruları
- Sağlık/tıbbi tavsiyeler
- Hukuki danışmanlık
- Kişisel ilişki tavsiyeleri
- Oyun/eğlence önerileri
- Seyahat/tatil tavsiyeleri
- Spor/fitness tavsiyeleri
- Astroloji/fal
- Politik/dini konular

#### Kapsam Dışı Yanıt
```
Ben Golaks IQ, sadece Golaks yazılımları ve iş süreçleri konusunda size yardımcı olabilirim.
Muhasebe, stok, üretim veya ERP ile ilgili bir sorunuz varsa memnuniyetle yardımcı olurum! 😊
```

## Veritabanı

### ai_sunucular Tablosu
| Alan | Tip | Açıklama |
|------|-----|----------|
| sunucu_id | INT | Primary key |
| sunucu_adi | VARCHAR | Sunucu adı |
| sunucu_ip | VARCHAR | API endpoint URL |
| sunucu_api_anahtari | VARCHAR | API key |
| sunucu_modeli | VARCHAR | Model adı (gpt-4, claude-3, etc.) |
| sunucu_tipi | ENUM | openai, claude, groq, ollama, golaks |
| sunucu_durumu | ENUM | aktif, pasif, bakim |
| mevcut_yuk | INT | Anlık aktif istek sayısı |
| maksimum_yuk | INT | Maksimum eşzamanlı istek |
| basari_orani | DECIMAL | Başarı yüzdesi |
| ort_yanit_suresi | INT | Ortalama yanıt süresi (ms) |

### ai_konusmalar Tablosu
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | INT | Primary key |
| user_id | INT | Kullanıcı ID |
| mesaj | TEXT | Kullanıcı mesajı |
| yanit | TEXT | AI yanıtı |
| dil | VARCHAR | tr, en |
| server_id | INT | Kullanılan sunucu |
| response_time | INT | Yanıt süresi (ms) |
| retry_count | INT | Deneme sayısı |
| success | BOOLEAN | Başarı durumu |
| created_at | DATETIME | Oluşturma tarihi |

## Hata Yönetimi

### Retry Mekanizması
- Maksimum 3 deneme
- Her denemede farklı sunucu seçilir
- Başarısız sunucular exclude listesine eklenir

### Hata Mesajları
- `NO_SERVER_AVAILABLE` - Hiçbir sunucu müsait değil
- `AI_ERROR` - AI yanıt alınamadı
- `VALIDATION_ERROR` - Mesaj validasyonu başarısız

## Kullanım Örneği

```typescript
// Frontend'den AI'ya mesaj gönderme
const response = await aiService.sendChatMessage(
  "Stok sayımı nasıl yapılır?",
  conversationHistory
);

if (response.success) {
  const aiMessage = response.data.message;
  // Mesajı göster
}
```

## Güvenlik

- JWT token doğrulaması gerekli
- Mesaj uzunluğu: max 2000 karakter
- Konuşma geçmişi: max 10 mesaj
- API anahtarları veritabanında şifreli

## Performans İpuçları

1. **Konuşma geçmişini sınırlı tutun** - Son 10 mesaj yeterli
2. **Timeout ayarları** - 30 saniye connect, 5 saniye bağlantı
3. **Load balancing** - Yük dağılımı otomatik

## İlgili Dosyalar

- `src/screens/AIChatScreen.tsx` - Frontend UI
- `src/services/ai.service.ts` - API servis katmanı
- `api/controllers/AIController.php` - Backend controller
- `api/includes/AILoadBalancer.php` - Load balancer
- `api/includes/ChatSystemPrompts.php` - System prompts
