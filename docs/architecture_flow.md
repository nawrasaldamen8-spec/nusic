# مخطط التدفق والمعمارية (Architecture & Flow)

هذا الملف يوضح آلية عمل مشروع مشغل الصوتيات الشخصي، وكيفية تدفق البيانات بين الواجهة (**Vercel**)، والـ Backend (**Render**)، وقاعدة البيانات (**Neon DB**)، مع الاعتماد على سحب الصوت على شكل **Chunks** وتخزينها مؤقتاً في المتصفح (`IndexedDB`) دون تخزين أي ملفات صوتية على السيرفر أو الكلاود.

---

## 1. نظرة عامة على المكونات (Components Overview)

```mermaid
flowchart LR
    subgraph Browser["المتصفح (Client)"]
        UI["React TS UI (Vercel)"]
        CM["Chunk Manager"]
        IDB[("IndexedDB (Temp Chunks)")]
        MSE["MSE / Audio Player"]
    end

    subgraph Cloud["الاستضافة (Cloud)"]
        API[".NET Backend (Render)"]
        DB[("Neon DB (PostgreSQL)")]
    end

    Ext["External Media / YouTube"]

    UI -->|"Auth / Playlists / Song URLs"| API
    API <-->|"Users, Playlists, Links"| DB
    CM -->|"1. Request Chunk (Range)"| API
    API -->|"2. Resolve URL + Fetch Range"| Ext
    Ext -->|"3. Stream Bytes (Memory)"| API
    API -->|"4. 206 Partial Content"| CM
    CM -->|"5. Save Chunk"| IDB
    IDB -->|"6. Feed Buffer"| MSE
```

### توزيع المسؤوليات:
* **Vercel (`React + TypeScript`):**
  * عرض واجهة المستخدم، تسجيل الدخول، وإدارة الـ Playlists.
  * تشغيل **Chunk Manager** لسحب الأجزاء، حفظها مؤقتاً في `IndexedDB`، وتغذية المشغل (`MSE` / `<audio>`).
  * رسم شريط التقدم (الجزء المشغّل + الجزء المحمّل مسبقاً باللون الأبيض/الرمادي).
  * حذف الـ chunks الخاصة بالأغنية من `IndexedDB` فور انتهائها أو الانتقال لأغنية أخرى.
* **Render (`.NET` Web API):**
  * إدارة المصادقة (Authentication) وعمليات الـ Playlists مع قاعدة البيانات.
  * **URL Resolver:**
    * إذا كان الرابط من **YouTube**: يستخرج رابط الـ stream الصوتي المباشر لحظياً (`WebM/Opus` أو `M4A/AAC`).
    * إذا كان الرابط من **Spotify**: يستخرج اسم الأغنية والفنان (Metadata فقط)، ثم يبحث عن المطابقة على **YouTube** ويجلب رابط الـ stream الصوتي منها (لأن صوتيات Spotify محمية بـ DRM).
    * يخزّن رابط الـ stream المستخرج مؤقتاً في الذاكرة (In-Memory Cache) لفترة قصيرة لتجنب إعادة الاستخراج والبحث مع كل chunk.
  * **Streaming Range Proxy:** استقبال طلبات الـ `Range` من `React` وتمرير الـ bytes من المصدر الخارجي إلى المتصفح مباشرة بالذاكرة دون حفظ أي ملف على القرص.
* **Neon DB (`PostgreSQL`):**
  * تخزين البيانات الوصفية فقط: بيانات الحساب الشخصي، الـ Playlists، وروابط الأغاني الأصلية (`source_url`).

---

## 2. تدفق معالجة الروابط (YouTube & Spotify Resolver Flow)

```mermaid
flowchart TD
    Link["رابط الأغنية من Neon DB"] --> Check{"نوع الرابط؟"}
    Check -->|"YouTube URL"| YT["استخراج رابط الصوت المباشر من YouTube"]
    Check -->|"Spotify URL"| SP["سحب Metadata (اسم الأغنية + الفنان)"]
    SP --> Search["البحث عن الأغنية على YouTube"]
    Search --> YT
    YT --> Cache["حفظ رابط الـ Stream مؤقتاً في Memory Cache"]
    Cache --> Proxy["تمرير Chunks عبر Range Proxy"]
```

---

## 3. تدفق تشغيل الأغنية والـ Chunks (Playback & Chunking Flow)

```mermaid
sequenceDiagram
    actor User as المستخدم
    participant React as React TS + Chunk Manager
    participant IDB as IndexedDB
    participant MSE as MediaSource (Audio)
    participant Render as .NET Backend (Render)
    participant Neon as Neon DB
    participant Source as External Source

    User->>React: تسجيل الدخول واختيار Playlist
    React->>Render: طلب الـ Playlists والأغاني
    Render->>Neon: استرجاع الروابط المحفوظة
    Neon-->>Render: قائمة الأغاني (URLs فقط)
    Render-->>React: إرجاع القائمة

    User->>React: الضغط على Play لأغنية
    React->>Render: طلب معلومات الـ Stream (Track ID)
    Render->>Source: استخراج رابط الصوت المباشر + الحجم + الصيغة
    Render-->>React: إرجاع Metadata (Total Size, MIME Type)

    loop سحب وتخزين الـ Chunks حسب الحاجة
        React->>IDB: هل الـ Chunk المطلوب موجود؟
        alt غير موجود في IndexedDB
            React->>Render: GET /stream/{id} (Range: bytes=start-end)
            Render->>Source: طلب نفس الـ Range
            Source-->>Render: إرجاع Bytes
            Render-->>React: 206 Partial Content + Bytes
            React->>IDB: تخزين الـ Chunk مؤقتاً
        end
        React->>MSE: تمرير الـ Chunk إلى SourceBuffer
        MSE-->>User: تشغيل الصوت + تحديث الشريط الأبيض (Buffered)
    end

    User->>React: انتهاء الأغنية أو الانتقال للتالية
    React->>MSE: تفريغ الـ SourceBuffer
    React->>IDB: حذف جميع Chunks الأغنية السابقة
```

---

## 4. إدارة الكاش المحلي (IndexedDB Lifecycle)

الهدف من `IndexedDB` هو الاحتفاظ بأجزاء الأغنية الحالية فقط أثناء الاستماع:
1. **مفتاح التخزين:** يتم ربط كل chunk بـ `trackId` ورقم/مجال الـ chunk (مثلاً `trackId + chunkIndex`).
2. **التحميل المسبق (Prefetching):** أثناء تشغيل chunk رقم `N`، يقوم الـ Chunk Manager بسحب `N+1` و `N+2` في الخلفية وتخزينها في `IndexedDB` ليظهر الشريط الأبيض متقدماً على التشغيل.
3. **التقديم والتأخير (Seeking):** إذا قفز المستخدم إلى ثانية معينة، يحسب الـ Chunk Manager رقم الـ chunk المقابل؛ إذا كان موجوداً في `IndexedDB` يقرأه فوراً، وإلا يطلبه عبر `Range` من `.NET`.
4. **التنظيف (Cleanup):**
   * عند انتهاء الأغنية (`ended`) أو الضغط على **Next / Previous**: يتم حذف كل السجلات المرتبطة بـ `trackId` القديم من `IndexedDB`.
   * عند فتح التطبيق لأول مرة: يُفضّل عمل فحص سريع لمسح أي chunks عالقة من جلسة سابقة أُغلق فيها المتصفح فجأة.

---

## 5. ملاحظات مهمة خاصة ببيئة الرفع (Vercel + Render + Neon)

1. **إعدادات CORS على Render:**
   * يجب السماح لدومين `Vercel` بالوصول إلى الـ Backend.
   * يجب كشف (Expose) الـ headers التالية في الاستجابة حتى يتمكن `fetch` في `React` من قراءة حجم الملف ونطاق البايتات: `Content-Range`، `Accept-Ranges`، و `Content-Length`.
2. **صيغة الصوت مع MSE:**
   * متصفحات الويب تتعامل بشكل ممتاز مع `MediaSource` عندما يكون الـ stream بصيغة `WebM (Opus)` أو `fMP4 (AAC)`، بينما `MP3` الخام قد لا يكون مدعوماً في `MSE` على بعض المتصفحات (مثل Safari).
3. **تخزين الرابط المستخرج مؤقتاً في `.NET`:**
   * عند تشغيل أغنية واحدة، سيرسل `React` عدة طلبات `Range` متتالية (واحد لكل chunk).
   * وجود Cache مؤقت في ذاكرة `.NET` يربط `trackId` برابط الـ stream المستخرج يمنع إعادة استخراج الرابط من المصدر الخارجي مع كل chunk، مما يسرّع التشغيل ويقلل احتمالية الحظر.
4. **سكون السيرفر على Render (Free Tier):**
   * إذا كنت تستخدم الخطة المجانية على Render، سيتوقف السيرفر بعد فترة من عدم الاستخدام، وقد يستغرق أول طلب تشغيل أو تسجيل دخول ~30–50 ثانية للاستيقاظ.
5. **الـ IP على Render مع الروابط الخارجية:**
   * بما أن Render يعمل على سيرفرات سحابية (Datacenter IPs)، قد تفرض بعض المواقع مثل YouTube قيوداً أو تطلب تحققاً أحياناً، وبما أن الاستخدام شخصي فالأمر يكون أخف، لكن يُفضّل معالجة أخطاء الاستخراج وإظهار رسالة واضحة في الواجهة إذا تعذّر جلب المصدر.
