import { useState, useEffect, useRef } from "react"
import Head from "next/head"
import Layout from "../../components/layout/Layout"
import { supabase } from "../../lib/initSupabase"
import { 
  HelpCircle, 
  Home, 
  Briefcase, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  ChevronLeft,
  Lightbulb,
  DollarSign,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  Loader2
} from "lucide-react"

const HelpSection = () => {
  const [activeSection, setActiveSection] = useState("getting-started")
  const [userRole, setUserRole] = useState(null)
  const [screenshots, setScreenshots] = useState({})
  const [isUploading, setIsUploading] = useState({})
  const fileInputRefs = useRef({})

  useEffect(() => {
    fetchUserRole()
    fetchScreenshots()
  }, [])

  const fetchUserRole = async () => {
    try {
      const user = supabase.auth.user()
      if (!user) return

      const { data, error } = await supabase
        .from('user_metadata')
        .select('role')
        .or(`user_id.eq.${user.id},admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id}`)
        .limit(1)

      if (data && data.length > 0) {
        setUserRole(data[0].role)
      }
    } catch (err) {
      console.error("Error fetching user role:", err)
    }
  }

  const fetchScreenshots = async () => {
    try {
      const { data, error } = await supabase
        .from('help_screenshots')
        .select('section_key, image_url')

      if (error) throw error

      if (data) {
        const screenshotMap = {}
        data.forEach(item => {
          screenshotMap[item.section_key] = item.image_url
        })
        setScreenshots(screenshotMap)
      }
    } catch (err) {
      console.error("Error fetching screenshots:", err)
    }
  }

  const handleFileUploadClick = (sectionId) => {
    if (fileInputRefs.current[sectionId]) {
      fileInputRefs.current[sectionId].click()
    }
  }

  const handleImageUpload = async (e, sectionId) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setIsUploading(prev => ({ ...prev, [sectionId]: true }))

      const fileExt = file.name.split('.').pop()
      const fileName = `${sectionId}_${Date.now()}.${fileExt}`
      const filePath = `help-center/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { publicURL } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('help_screenshots')
        .upsert({ 
          section_key: sectionId, 
          image_url: publicURL,
          updated_at: new Date().toISOString()
        })

      if (dbError) throw dbError

      setScreenshots(prev => ({ ...prev, [sectionId]: publicURL }))
      
    } catch (err) {
      console.error("Error uploading image:", err)
      alert("حدث خطأ أثناء رفع الصورة.")
    } finally {
      setIsUploading(prev => ({ ...prev, [sectionId]: false }))
    }
  }

  const ScreenshotBlock = ({ sectionId }) => {
    const imageUrl = screenshots[sectionId]
    const loading = isUploading[sectionId]
    const isSuperAdmin = userRole === 'super_admin'

    if (!imageUrl && !isSuperAdmin && !loading) return null;

    return (
      <div className="screenshot-container">
        {imageUrl ? (
          <div className="image-wrapper">
            <img src={imageUrl} alt={`لقطة شاشة لقسم ${sectionId}`} className="help-screenshot" />
            {isSuperAdmin && (
              <button 
                className="edit-image-btn"
                onClick={() => handleFileUploadClick(sectionId)}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                تغيير الصورة
              </button>
            )}
          </div>
        ) : (
          isSuperAdmin && (
            <div className="empty-upload-area" onClick={() => handleFileUploadClick(sectionId)}>
              {loading ? (
                <>
                  <Loader2 size={36} className="animate-spin upload-icon-loading" />
                  <p>جاري الرفع...</p>
                </>
              ) : (
                <>
                  <ImageIcon size={36} className="upload-icon-idle" />
                  <p>انقر لرفع لقطة شاشة لهذا القسم</p>
                  <span>يظهر هذا الزر فقط لـ super_admin</span>
                </>
              )}
            </div>
          )
        )}
        <input 
          type="file" 
          accept="image/*" 
          style={{ display: 'none' }}
          ref={el => fileInputRefs.current[sectionId] = el}
          onChange={(e) => handleImageUpload(e, sectionId)}
        />
      </div>
    )
  }

  const sections = [
    {
      id: "getting-started",
      title: "البدء السريع والأرشفة",
      icon: <Home className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">البدء السريع والأرشفة</h2>
          <p className="section-description">
            مرحباً بك في نظام إدارة مكتب المحاماة الذكي! تم تصميم هذا النظام ليكون المساعد الشخصي الذي ينظم كل جوانب عملك القانوني. إليك دليلاً شاملاً للبدء بقوة.
          </p>
          
          <div className="tip-box">
            <Lightbulb className="tip-icon" size={24} />
            <div className="tip-content">
              <strong>نصيحة ذهبية:</strong> اجعل لوحة القيادة هي محطتك الأولى كل صباح. ستجد فيها ملخصاً لحالتك اليومية، مما يغنيك عن البحث في الملفات الورقية.
            </div>
          </div>

          <div className="guide-item">
            <h3>لوحة القيادة</h3>
            <p>
              لوحة القيادة هي مركز التحكم الرقمي الخاص بك. تعمل على تجميع البيانات من جميع أقسام النظام لتعطيك صورة واضحة ومباشرة عن وضع المكتب:
            </p>
            <ul className="detailed-list">
              <li><strong>الإحصائيات العلوية:</strong> تعرض لك أرقاماً سريعة عن إجمالي القضايا النشطة، الجلسات المقررة لليوم، والمهام المتأخرة. اضغط على أي رقم للانتقال لتفاصيله.</li>
              <li><strong>الجلسات القادمة:</strong> جدول زمني يوضح جلسات المحكمة القريبة لتتجنب أي تأخير أو غياب.</li>
              <li><strong>سجل النشاطات:</strong> شريط يتابع آخر الأحداث في النظام، مثل دفعة مالية جديدة تم تسجيلها، أو مستند قام الموكل برفعه حديثاً.</li>
            </ul>
            <ScreenshotBlock sectionId="dashboard-overview" />
          </div>

          <div className="guide-item">
            <h3>الأرشفة الفورية</h3>
            <p>
              وقت المحامي ثمين جداً، خاصة أثناء تواجده في المحكمة. صممنا أداة "الأرشفة الفورية" لتلبية الحاجة السريعة لحفظ المعلومات:
            </p>
            <ul className="detailed-list">
              <li><strong>الالتقاط السريع:</strong> يمكنك التقاط صورة لقرار حكم أو محضر جلسة من هاتفك ورفعها فوراً للنظام.</li>
              <li><strong>حفظ بلا تعقيد:</strong> لا تحتاج إلى البحث عن ملف القضية أولاً لرفع المستند. احفظه في الأرشيف الفوري وضع له عنواناً سريعاً، وفي وقت لاحق يمكنك نقله وربطه بالقضية الصحيحة.</li>
            </ul>
            <ScreenshotBlock sectionId="quick-archive" />
          </div>
        </div>
      )
    },
    {
      id: "clients-portal",
      title: "الموكلين وبوابة الموكل",
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">الموكلين وبوابة الموكل</h2>
          <p className="section-description">
            إضافة الموكلين هي الخطوة الأولى والأساسية قبل إنشاء أي قضية. النظام يعتمد على ربط كل قضية، أو فاتورة، أو مستند بملف الموكل لضمان التنظيم.
          </p>

          <div className="guide-item">
            <h3>إضافة موكل جديد (الخطوة الأولى دائماً)</h3>
            <p>
              لا يمكنك إنشاء دعوى دون تحديد الموكل الخاص بها. لذلك، يجب دائماً البدء بإضافة الموكل:
            </p>
            <ul className="detailed-list">
              <li>انتقل إلى قسم <strong>الموكلين</strong> من القائمة الجانبية واضغط على زر <strong>إضافة موكل جديد</strong>.</li>
              <li><strong>الاسم والصفة:</strong> أدخل الاسم الكامل للموكل. تأكد من تحديد نوعه (فرد أو شركة).</li>
              <li><strong>رقم الهاتف والبريد الإلكتروني:</strong> هذه البيانات ضرورية إذا كنت ترغب لاحقاً بمنح الموكل صلاحية الدخول لبوابة الموكلين.</li>
              <li><strong>كلمة المرور:</strong> إذا قمت بتعيين كلمة مرور للموكل هنا، سيتمكن من استخدام رقم هاتفه وكلمة المرور هذه للدخول إلى حسابه الخاص لمتابعة قضاياه.</li>
            </ul>
            <ScreenshotBlock sectionId="add-client-form" />
          </div>

          <div className="guide-item">
            <h3>جدول الموكلين وملف الموكل</h3>
            <p>
              بعد إضافة الموكلين، سيظهرون في جدول الموكلين حيث يمكنك إدارتهم:
            </p>
            <ul className="detailed-list">
              <li><strong>شريط البحث:</strong> يمكنك البحث عن الموكلين باسمهم أو برقم هاتفهم بسرعة.</li>
              <li><strong>ملف الموكل الشامل:</strong> بالضغط على اسم الموكل أو زر "إدارة"، ستنتقل إلى صفحة ملف الموكل، والتي تجمع كل ما يخصه في مكان واحد (قضاياه الحالية والسابقة، كشف الحساب المالي الخاص به، ومستنداته المرفوعة).</li>
            </ul>
            <ScreenshotBlock sectionId="clients-table" />
          </div>

          <div className="guide-item">
            <h3>بوابة الموكل</h3>
            <p>
              بوابة الموكل هي ميزة استثنائية تقلل من اتصالات الموكلين المستمرة، حيث تمنحهم خدمة ذاتية للاطلاع على قضاياهم:
            </p>
            <ul className="detailed-list">
              <li><strong>صلاحيات آمنة:</strong> الموكل يرى <strong>قضاياه الخاصة فقط</strong> ولا يمكنه أبداً الاطلاع على بيانات موكلين آخرين.</li>
              <li><strong>الشفافية:</strong> يمكنه متابعة تواريخ الجلسات، قراءة القرارات الصادرة، ومتابعة وضعه المالي (ما دفعه وما تبقى عليه).</li>
              <li><strong>رفع المستندات:</strong> يمكن للموكل تصوير أي وثيقة مطلوبة منه ورفعها عبر بوابته، لتصلك مباشرة في ملفه داخل النظام.</li>
            </ul>
            <ScreenshotBlock sectionId="client-portal-access" />
          </div>
        </div>
      )
    },
    {
      id: "cases-management",
      title: "إدارة القضايا",
      icon: <Briefcase className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">إدارة القضايا</h2>
          <p className="section-description">
            القضايا هي جوهر النظام. بعد إضافة الموكل بنجاح، يمكنك الآن البدء بإنشاء قضاياه وإدارتها بكفاءة.
          </p>

          <div className="guide-item">
            <h3>خطوات إضافة دعوى جديدة بشكل صحيح</h3>
            <p style={{ color: "#b91c1c", fontWeight: "700", marginBottom: "16px", backgroundColor: "#fef2f2", padding: "12px", borderRadius: "8px", borderRight: "4px solid #ef4444" }}>
              ملاحظة هامة جداً: لا يمكنك إنشاء دعوى دون تحديد الموكل الخاص بها. لذلك، يجب دائماً البدء بإضافة الموكل من صفحة "إضافة موكل" في قسم الموكلين أولاً، ثم العودة إلى هنا لإضافة الدعوى.
            </p>
            <p>
              لإضافة دعوى، توجه إلى قائمة <strong>القضايا</strong> واضغط على <strong>إضافة قضية جديدة</strong>. تعبئة النموذج بدقة أمر بالغ الأهمية:
            </p>
            <ul className="detailed-list">
              <li><strong>اختيار الموكل:</strong> افتح القائمة المنسدلة وابحث عن الموكل الذي أضفته مسبقاً. هذه الخطوة إلزامية لربط القضية به.</li>
              <li><strong>رقم الدعوى والمحكمة:</strong> أدخل رقم الدعوى والسنة واسم المحكمة المختصة. هذا يساعد في الفلترة والتقارير.</li>
              <li><strong>موضوع الدعوى:</strong> اكتب وصفاً موجزاً لموضوع الدعوى للرجوع إليه بسرعة.</li>
              <li><strong>الأتعاب (الرسوم):</strong> أدخل إجمالي الأتعاب المتفق عليها للقضية. سيقوم النظام لاحقاً بحساب الدفعات والمتبقي بناءً على هذا الرقم.</li>
            </ul>
            <ScreenshotBlock sectionId="add-case-form" />
          </div>

          <div className="guide-item">
            <h3>جدول القضايا</h3>
            <p>
              يعرض هذا الجدول جميع القضايا الموجودة في المكتب، مع أدوات للفرز والبحث:
            </p>
            <ul className="detailed-list">
              <li><strong>الفلاتر السريعة:</strong> استخدم الأزرار العلوية لعرض "القضايا النشطة" فقط، أو "القضايا المغلقة"، أو عرض "الكل".</li>
              <li><strong>البحث:</strong> يمكنك البحث باستخدام رقم الدعوى أو اسم الموكل للوصول السريع.</li>
              <li><strong>أزرار الإجراءات:</strong> من الجدول مباشرة يمكنك الدخول إلى "إدارة القضية" لتفاصيلها، أو حذفها إن لزم الأمر (للمدراء فقط).</li>
            </ul>
            <ScreenshotBlock sectionId="cases-table" />
          </div>

          <div className="guide-item">
            <h3>صفحة تفاصيل القضية</h3>
            <p>
              عند الضغط على "إدارة" بجانب أي قضية، ستدخل إلى غرفة التحكم الخاصة بتلك القضية. تتكون هذه الصفحة من عدة تبويبات رئيسية:
            </p>

            <h4 style={{ marginTop: '20px', color: '#1e293b' }}>1. المعلومات الأساسية</h4>
            <ul className="detailed-list" style={{ marginTop: '10px' }}>
              <li>يعرض ملخصاً لبيانات الدعوى.</li>
              <li>يمكنك تعديل حالة القضية هنا (مثلاً: من "قيد المرافعة" إلى "منتهية" عند صدور الحكم). تغيير الحالة لـ "مغلقة" سيزيلها من لوحة القيادة النشطة وينقلها للأرشيف.</li>
            </ul>
            <ScreenshotBlock sectionId="case-details-info" />

            <h4 style={{ marginTop: '20px', color: '#1e293b' }}>2. تبويب الجلسات</h4>
            <ul className="detailed-list" style={{ marginTop: '10px' }}>
              <li><strong>إضافة جلسة:</strong> حدد تاريخ ووقت الجلسة القادمة.</li>
              <li><strong>التحديثات المستمرة:</strong> بعد انتهاء الجلسة، قم بتحديثها لإضافة "قرار المحكمة" وما هو "المطلوب للجلسة القادمة".</li>
              <li>جميع الجلسات المضافة هنا تظهر تلقائياً في التقويم العام للمكتب.</li>
            </ul>
            <ScreenshotBlock sectionId="case-details-sessions" />

            <h4 style={{ marginTop: '20px', color: '#1e293b' }}>3. تبويب المستندات</h4>
            <ul className="detailed-list" style={{ marginTop: '10px' }}>
              <li>استغني عن الملفات الورقية. يمكنك هنا رفع أي ملف PDF، صورة، أو مستند Word يخص القضية.</li>
              <li>نظم المستندات بتسميات واضحة (مثال: "لائحة الدعوى"، "وكالة الموكل"، "قرار تمييزي").</li>
            </ul>
            <ScreenshotBlock sectionId="case-details-docs" />

            <h4 style={{ marginTop: '20px', color: '#1e293b' }}>4. تبويب المصروفات</h4>
            <ul className="detailed-list" style={{ marginTop: '10px' }}>
              <li>سجل أي مصاريف متعلقة بهذه القضية تحديداً (مثل رسوم المحكمة، أجور الخبراء، مصاريف النقل).</li>
              <li>يتم جمع هذه المصروفات لاحقاً في التقارير المالية لبيان تكلفة كل قضية.</li>
            </ul>
            <ScreenshotBlock sectionId="case-details-expenses" />
          </div>
        </div>
      )
    },
    {
      id: "tasks-calendar",
      title: "المهام والتقويم",
      icon: <Calendar className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">إدارة المهام والتقويم</h2>
          <p className="section-description">
            إدارة الوقت والمواعيد النهائية هي الفرق بين المحامي الناجح والمنظم، والمحامي المشتت.
          </p>

          <div className="guide-item">
            <h3>إدارة المهام</h3>
            <p>
              المهام هي التكليفات الداخلية في المكتب، مثل كتابة لائحة أو مراجعة دائرة حكومية:
            </p>
            <ul className="detailed-list">
              <li><strong>إنشاء مهمة:</strong> حدد عنوان المهمة، ووصفها، وتاريخ استحقاقها النهائي.</li>
              <li><strong>الأولويات:</strong> حدد أولوية المهمة (منخفضة، متوسطة، عالية) لتنظيم وقتك.</li>
              <li><strong>تفويض المهام:</strong> إذا كان هناك محامون آخرون في المكتب، يمكنك تحديد المحامي المسؤول عن تنفيذ المهمة لتصله في لوحته الخاصة.</li>
              <li><strong>ربط بقضية:</strong> لربط المهمة بقضية معينة، يفضل إضافتها من داخل تبويب "المهام" في صفحة "تفاصيل القضية".</li>
            </ul>
            <ScreenshotBlock sectionId="tasks-management" />
          </div>

          <div className="guide-item">
            <h3>التقويم التفاعلي</h3>
            <p>
              التقويم هو نظرتك المستقبلية الشاملة لأعمال المكتب:
            </p>
            <ul className="detailed-list">
              <li><strong>الدمج التلقائي:</strong> التقويم يجمع لك مواعيد الجلسات والمواعيد النهائية للمهام في شاشة واحدة. لا حاجة لإدخال المواعيد مرتين.</li>
              <li><strong>طرق العرض:</strong> تنقل بين العرض اليومي لمعرفة جدولك اليوم، أو الأسبوعي والشهري للتخطيط الاستراتيجي وتجنب تضارب الجلسات المحددة في المحاكم.</li>
              <li>بالنقر على أي حدث في التقويم، يمكنك الاطلاع على تفاصيله السريعة.</li>
            </ul>
            <ScreenshotBlock sectionId="calendar-view" />
          </div>
        </div>
      )
    },
    {
      id: "accounting",
      title: "المحاسبة والتقارير",
      icon: <DollarSign className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">المحاسبة والتقارير المالية</h2>
          <p className="section-description">
            تتبع التدفقات النقدية للمكتب (الواردات والصادرات) بدقة تامة لإصدار تقارير محاسبية شفافة.
          </p>

          <div className="guide-item">
            <h3>إدارة أتعاب المحاماة والمدفوعات</h3>
            <p>
              إدارة الأتعاب ترتبط مباشرة بالموكلين والقضايا:
            </p>
            <ul className="detailed-list">
              <li><strong>تسجيل الدفعات:</strong> عند استلام دفعة من موكل، اذهب إلى حسابه أو إلى القوائم المالية، وأضف دفعة جديدة. حدد المبلغ، تاريخ الدفع، وما إذا كانت كاش أو تحويل بنكي.</li>
              <li><strong>الرصيد التلقائي:</strong> سيقوم النظام بجمع المدفوعات وطرحها من إجمالي الأتعاب المتفق عليها للقضايا ليظهر لك <strong>المتبقي (الديون)</strong> على كل موكل بوضوح.</li>
              <li>يفضل إصدار سندات قبض مطبوعة من النظام لكل دفعة لضمان التوثيق.</li>
            </ul>
            <ScreenshotBlock sectionId="accounting-fees" />
          </div>

          <div className="guide-item">
            <h3>مصروفات المكتب</h3>
            <p>
              الجانب الآخر من المحاسبة هو تسجيل المصروفات التشغيلية للمكتب:
            </p>
            <ul className="detailed-list">
              <li><strong>تسجيل المصروفات:</strong> قم بتدوين الإيجارات، فواتير الكهرباء، الرواتب، والقرطاسية.</li>
              <li><strong>التصنيف:</strong> استخدم تصنيفات واضحة للمصروفات لتسهيل تحليل أين تصرف ميزانية المكتب.</li>
            </ul>
            <ScreenshotBlock sectionId="accounting-expenses" />
          </div>

          <div className="guide-item">
            <h3>استخراج التقارير المالية</h3>
            <p>
              بضغطة زر، يمكنك إصدار تقارير احترافية تعطي صورة واضحة عن الأداء المالي:
            </p>
            <ul className="detailed-list">
              <li><strong>تحديد الفترة:</strong> حدد تقريراً لشهر معين أو سنة معينة.</li>
              <li><strong>محتوى التقرير:</strong> سيقوم النظام بمقارنة الواردات (الدفعات المستلمة) بالصادرات (المصروفات) وإظهار صافي الدخل.</li>
              <li>هذه التقارير تصدر بصيغة PDF وتكون مزينة بشعار وترويسة المكتب الخاصة بك (إذا تم إعدادها في قسم الإعدادات).</li>
            </ul>
            <ScreenshotBlock sectionId="accounting-reports" />
          </div>
        </div>
      )
    },
    {
      id: "services-templates",
      title: "الخدمات والنماذج",
      icon: <FileText className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">الخدمات القانونية والنماذج الذكية</h2>
          <p className="section-description">
            نظام متطور لتبسيط صياغة العقود وتتبع الخدمات القانونية غير المرتبطة بقضايا المحاكم.
          </p>

          <div className="guide-item">
            <h3>الخدمات القانونية</h3>
            <p>
              ليست كل أعمال المحامي قضايا في المحاكم، فالاستشارات وصياغة العقود هي جزء أساسي من الدخل:
            </p>
            <ul className="detailed-list">
              <li>استخدم قسم الخدمات لتسجيل أعمال مثل (تأسيس شركة، صياغة عقد شراكة، استشارة قانونية).</li>
              <li>قم بربط هذه الخدمة بموكل وحدد قيمة الأتعاب الخاصة بها لتضاف لمديونية الموكل وتدخل في النظام المالي للمكتب.</li>
            </ul>
            <ScreenshotBlock sectionId="legal-services" />
          </div>

          <div className="guide-item">
            <h3>توليد المستندات عبر النماذج</h3>
            <p>
              تخلص من عناء نسخ ولصق البيانات في كل مرة تكتب فيها لائحة أو عقداً:
            </p>
            <ul className="detailed-list">
              <li><strong>مكتبة النماذج:</strong> قم بحفظ صيغك الجاهزة للوائح والدعاوى والوكالات في النظام مع وضع متغيرات (مثل اسم الموكل، عنوانه).</li>
              <li><strong>التعبئة الآلية:</strong> عند الحاجة لإنشاء مستند جديد، اختر النموذج، وحدد الموكل، وسيقوم النظام بتعويض المتغيرات ببيانات الموكل الحقيقية تلقائياً.</li>
              <li>حمل المستند النهائي كملف Word جاهز للطباعة والتوقيع خلال ثوانٍ.</li>
            </ul>
            <ScreenshotBlock sectionId="templates-generator" />
          </div>
        </div>
      )
    },
    {
      id: "team-settings",
      title: "فريق العمل والإعدادات",
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="help-content-wrapper fade-in">
          <h2 className="section-title">فريق العمل وإعدادات المكتب</h2>
          <p className="section-description">
            تخصيص النظام ليطابق هوية مكتبك وإدارة زملائك في العمل والمحامين المتدربين.
          </p>

          <div className="guide-item">
            <h3>إدارة المحامين</h3>
            <p>
              إذا كان مكتبك يضم فريقاً، يمكنك تنظيم العمل بينهم:
            </p>
            <ul className="detailed-list">
              <li><strong>إضافة زملاء:</strong> يمكنك إنشاء حسابات دخول منفصلة للمحامين العاملين معك.</li>
              <li><strong>الصلاحيات:</strong> حدد ما إذا كان المحامي يمكنه رؤية الأمور المالية أم لا.</li>
              <li><strong>تتبع الإنجاز:</strong> النظام يسجل اسم المحامي الذي قام بإضافة أي إجراء (مثل تحديث حالة جلسة أو إضافة دفعة) لضمان المساءلة.</li>
            </ul>
            <ScreenshotBlock sectionId="team-management" />
          </div>

          <div className="guide-item">
            <h3>الهوية البصرية</h3>
            <p>
              المظهر الاحترافي للمستندات الصادرة من مكتبك يعزز ثقة الموكلين:
            </p>
            <ul className="detailed-list">
              <li><strong>لوجو المكتب:</strong> ارفع شعار مكتبك من خلال صفحة الإعدادات.</li>
              <li><strong>الترويسة:</strong> اكتب اسم المكتب الرسمي والعنوان وأرقام التواصل.</li>
              <li>سيقوم النظام تلقائياً بوضع هذا الشعار والبيانات كـ Header و Footer احترافي على جميع التقارير بصيغة PDF التي تقوم بتصديرها (التقارير المالية، ملخصات القضايا).</li>
            </ul>
            <ScreenshotBlock sectionId="office-settings" />
          </div>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <Head>
        <title>مركز المساعدة | نظام المحامي الذكي</title>
      </Head>

      <div className="help-page-container" dir="rtl">
        <header className="help-header">
          <div className="header-info">
            <h1>مركز المساعدة والدعم</h1>
            <p>المرجع الشامل لفهم ميزات النظام والاستفادة القصوى من أدواته الاحترافية</p>
          </div>
          <HelpCircle size={40} className="header-icon" />
        </header>

        <div className="help-main-layout">
          {/* Sidebar Navigation */}
          <aside className="help-sidebar">
            <nav>
              {sections.map((section) => (
                <button
                  key={section.id}
                  className={`sidebar-nav-item ${activeSection === section.id ? "active" : ""}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="icon-wrapper">{section.icon}</span>
                  <span className="nav-text">{section.title}</span>
                  <ChevronLeft className="arrow-icon" size={16} />
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <main className="help-content-area">
            {sections.find((s) => s.id === activeSection)?.content}
          </main>
        </div>
      </div>

      <style jsx global>{`
        .help-page-container {
          padding: 32px 24px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: 'Cairo', sans-serif;
        }

        .help-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #2563eb, #1e40af);
          color: white;
          padding: 16px 32px;
          border-radius: 16px;
          margin-bottom: 32px;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.15);
        }

        .header-info h1 {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .header-info p {
          margin: 6px 0 0;
          opacity: 0.9;
          font-size: 1rem;
          font-weight: 500;
        }

        .header-icon {
          opacity: 0.15;
          transform: scale(1.2);
        }

        .help-main-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 40px;
        }

        .help-sidebar {
          background: white;
          border-radius: 20px;
          padding: 24px 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          height: fit-content;
          position: sticky;
          top: 100px;
          border: 1px solid #f3f4f6;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 14px 16px;
          margin-bottom: 8px;
          border: none;
          background: transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #4b5563;
          text-align: right;
          font-family: 'Cairo', sans-serif;
        }

        .sidebar-nav-item:hover {
          background: #f8fafc;
          color: #2563eb;
          transform: translateX(-4px);
        }

        .sidebar-nav-item.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
          box-shadow: inset -3px 0 0 #2563eb;
        }

        .icon-wrapper {
          margin-left: 14px;
          display: flex;
          align-items: center;
        }

        .nav-text {
          flex: 1;
          font-size: 1.05rem;
          white-space: nowrap;
        }

        .arrow-icon {
          opacity: 0;
          transition: transform 0.3s, opacity 0.3s;
        }

        .sidebar-nav-item.active .arrow-icon {
          opacity: 1;
          transform: translateX(-4px);
        }

        .help-content-area {
          background: white;
          border-radius: 20px;
          padding: 48px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          min-height: 700px;
          border: 1px solid #f3f4f6;
        }

        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .section-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
          position: relative;
          padding-bottom: 12px;
        }

        .section-title::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 60px;
          height: 4px;
          background: #2563eb;
          border-radius: 2px;
        }

        .section-description {
          font-size: 1.15rem;
          color: #475569;
          margin-bottom: 40px;
          line-height: 1.8;
          font-weight: 500;
        }

        .guide-item {
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .guide-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .guide-item h3 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .guide-item p {
          color: #334155;
          line-height: 1.8;
          margin-bottom: 16px;
          font-size: 1.15rem;
        }

        .detailed-list {
          padding-right: 24px;
          margin-bottom: 32px;
          margin-top: 16px;
          list-style-type: disc !important;
        }

        .detailed-list li {
          margin-bottom: 12px;
          color: #334155;
          font-size: 1.15rem;
          line-height: 1.8;
          display: list-item;
        }

        .tip-box {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          background: linear-gradient(to left, #fefce8, #fef9c3);
          border: 1px solid #fde047;
          padding: 24px;
          border-radius: 16px;
          margin-bottom: 48px;
          color: #854d0e;
          box-shadow: 0 4px 12px rgba(234, 179, 8, 0.05);
        }

        .tip-icon {
          color: #eab308;
          flex-shrink: 0;
        }

        .tip-content {
          font-size: 1.1rem;
          line-height: 1.8;
        }

        .screenshot-container {
          margin-top: 24px;
          border-radius: 16px;
          overflow: hidden;
        }

        .image-wrapper {
          position: relative;
          display: inline-block;
          max-width: 100%;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .help-screenshot {
          display: block;
          max-width: 100%;
          height: auto;
          transition: transform 0.3s ease;
        }

        .image-wrapper:hover .help-screenshot {
          transform: scale(1.01);
        }

        .edit-image-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e2e8f0;
          padding: 10px 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .edit-image-btn:hover {
          background: white;
          color: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }

        .empty-upload-area {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .empty-upload-area:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          transform: scale(0.99);
        }

        .upload-icon-idle {
          color: #94a3b8;
          margin-bottom: 12px;
          transition: color 0.2s;
        }

        .empty-upload-area:hover .upload-icon-idle {
          color: #64748b;
        }

        .upload-icon-loading {
          color: #3b82f6;
          margin-bottom: 12px;
        }

        .empty-upload-area p {
          color: #334155;
          margin: 0 0 8px 0;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .empty-upload-area span {
          color: #64748b;
          font-size: 0.9rem;
        }

        @media (max-width: 968px) {
          .help-main-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .help-sidebar {
            position: static;
            padding: 16px;
          }

          .help-content-area {
            padding: 24px;
          }
        }
      `}</style>
    </Layout>
  )
}

export default HelpSection
