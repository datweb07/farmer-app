# Media Enhancement - Setup Guide

## 🎯 Tổng Quan

Tôi đã implement hoàn chỉnh 3 tính năng media enhancement:

1. **Multiple Images** - Upload nhiều ảnh, gallery/carousel
2. **Video Support** - Upload video, thumbnail, player
3. **Rich Text Editor** - Format text, links, mentions

---

## 📦 Đã Tạo

### **1. Database Schema** ([014_media_enhancement.sql](supabase/migrations/014_media_enhancement.sql))

**Tables mới:**

- `post_images` - Multiple images per post
- `post_videos` - Videos cho posts
- `product_images` - Multiple images per product
- `product_videos` - Videos cho products

**Features:**

- ✅ RLS policies đầy đủ
- ✅ Display order cho images
- ✅ Primary image flag cho products
- ✅ Video metadata (duration, file size)
- ✅ Helper functions: `get_post_with_media()`, `get_product_with_media()`

### **2. Services**

#### **Media Upload Service** ([media-upload.service.ts](src/lib/media/media-upload.service.ts))

```typescript
// Upload multiple images
uploadMultipleImages(files, bucket, userId);

// Upload video với thumbnail tự động
uploadVideo(file, bucket, userId);

// Delete file
deleteFile(bucket, filePath);
```

**Features:**

- ✅ Validate file types & sizes
- ✅ Auto-generate video thumbnails
- ✅ Extract video duration
- ✅ Unique filenames
- ✅ Error handling

**Limits:**

- Images: Max 5MB, JPG/PNG/WebP/GIF
- Videos: Max 50MB, MP4/WebM/MOV

### **3. UI Components**

#### **RichTextEditor** ([RichTextEditor.tsx](src/app/components/RichTextEditor.tsx))

```tsx
<RichTextEditor
  value={content}
  onChange={setContent}
  placeholder="Nhập nội dung..."
  maxLength={5000}
  showPreview={true}
/>
```

**Features:**

- ✅ **Bold** (`**text**`)
- ✅ _Italic_ (`*text*`)
- ✅ Lists (`- item`)
- ✅ [Links](url) (`[text](url)`)
- ✅ @Mentions (`@username`)
- ✅ Live preview
- ✅ Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)
- ✅ Character counter

#### **ImageGallery** ([ImageGallery.tsx](src/app/components/ImageGallery.tsx))

```tsx
// Full gallery với lightbox
<ImageGallery
  images={imageUrls}
  captions={captionArray}
  startIndex={0}
/>

// Carousel nhỏ cho cards
<ImageCarousel
  images={imageUrls}
  className="h-64"
/>
```

**Features:**

- ✅ Prev/Next navigation
- ✅ Keyboard controls (arrows, ESC)
- ✅ Fullscreen mode
- ✅ Thumbnails strip
- ✅ Image counter
- ✅ Dots indicator

#### **VideoPlayer** ([VideoPlayer.tsx](src/app/components/VideoPlayer.tsx))

```tsx
// Full video player
<VideoPlayer
  src={videoUrl}
  thumbnail={thumbnailUrl}
  autoPlay={false}
/>

// Thumbnail cho cards
<VideoThumbnail
  thumbnail={thumbnailUrl}
  duration={120}
  onClick={handlePlay}
/>
```

**Features:**

- ✅ Play/Pause
- ✅ Progress bar với seek
- ✅ Volume control
- ✅ Fullscreen
- ✅ Time display
- ✅ Auto-hide controls
- ✅ Loading state

---

## 🚀 Cách Tích Hợp

### **Step 1: Chạy Migration**

```bash
# Trong Supabase Dashboard > SQL Editor
# Chạy file: supabase/migrations/014_media_enhancement.sql
```

### **Step 2: Tạo Storage Buckets**

Trong Supabase Dashboard > Storage:

1. Create bucket `post-videos` (public)
2. Create bucket `product-videos` (public)
3. Buckets `post-images` và `product-images` đã có

### **Step 3: Update CreatePostModal**

```tsx
import { RichTextEditor } from './RichTextEditor';
import { uploadMultipleImages, uploadVideo } from '../../lib/media/media-upload.service';

// State
const [content, setContent] = useState('');
const [selectedImages, setSelectedImages] = useState<File[]>([]);
const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

// Trong form
<RichTextEditor
  value={content}
  onChange={setContent}
  placeholder="Chia sẻ kinh nghiệm của bạn..."
/>

<input
  type="file"
  multiple
  accept="image/*"
  onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
/>

<input
  type="file"
  accept="video/*"
  onChange={(e) => setSelectedVideo(e.target.files?.[0] || null)}
/>

// Submit
const handleSubmit = async () => {
  // 1. Create post với content từ RichTextEditor
  const { post } = await createPost({ title, content });

  // 2. Upload multiple images
  if (selectedImages.length > 0) {
    const { images } = await uploadMultipleImages(
      selectedImages,
      'post-images',
      user.id
    );

    // Save to post_images table
    for (let i = 0; i < images.length; i++) {
      await supabase.from('post_images').insert({
        post_id: post.id,
        image_url: images[i].url,
        display_order: i
      });
    }
  }

  // 3. Upload video
  if (selectedVideo) {
    const { video } = await uploadVideo(
      selectedVideo,
      'post-videos',
      user.id
    );

    await supabase.from('post_videos').insert({
      post_id: post.id,
      video_url: video.url,
      thumbnail_url: video.thumbnail,
      duration: video.duration
    });
  }
};
```

### **Step 4: Update PostCard để hiển thị**

```tsx
import { ImageCarousel } from "./ImageCarousel";
import { VideoThumbnail } from "./VideoPlayer";

// Fetch images & videos
const [images, setImages] = useState<string[]>([]);
const [video, setVideo] = useState<any>(null);

useEffect(() => {
  loadMedia();
}, [post.id]);

const loadMedia = async () => {
  // Load images
  const { data: imagesData } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", post.id)
    .order("display_order");

  setImages(imagesData?.map((img) => img.image_url) || []);

  // Load video
  const { data: videoData } = await supabase
    .from("post_videos")
    .select("*")
    .eq("post_id", post.id)
    .single();

  setVideo(videoData);
};

// Render
<div>
  {/* Rich text content */}
  <div
    className="prose"
    dangerouslySetInnerHTML={{ __html: formatRichText(post.content) }}
  />

  {/* Image carousel */}
  {images.length > 0 && (
    <ImageCarousel images={images} className="mt-4 rounded-lg" />
  )}

  {/* Video */}
  {video && (
    <VideoThumbnail
      thumbnail={video.thumbnail_url}
      duration={video.duration}
      onClick={() => setShowVideoModal(true)}
    />
  )}
</div>;
```

---

## 📝 Examples

### **Example 1: Post với multiple images**

```tsx
const post = {
  title: "Kỹ thuật trồng lúa mới",
  content:
    "**Hướng dẫn chi tiết:**\n\n- Bước 1: Chuẩn bị đất\n- Bước 2: Gieo hạt\n\nXem thêm tại [đây](https://example.com)",
  images: ["image1.jpg", "image2.jpg", "image3.jpg"],
};
```

### **Example 2: Product với video**

```tsx
const product = {
  name: "Máy đo độ mặn",
  description:
    "**Tính năng:**\n\n- Đo chính xác\n- Pin trâu\n\nLiên hệ: @seller",
  images: ["img1.jpg", "img2.jpg"],
  video: {
    url: "video.mp4",
    thumbnail: "thumb.jpg",
    duration: 120,
  },
};
```

---

## 🎨 UI Features

### **Rich Text**

- Bold, italic, lists
- Links với preview
- Mentions highlighting
- Live preview mode

### **Image Gallery**

- Multi-image support
- Smooth carousel
- Lightbox fullscreen
- Thumbnail navigation

### **Video Player**

- Custom controls
- Seek support
- Fullscreen
- Auto-hide controls

---

## 🔧 Troubleshooting

### Images không load

- Check storage bucket policies
- Verify image URLs format
- Check RLS policies

### Video không play

- Verify video format (MP4 preferred)
- Check file size < 50MB
- Test thumbnail generation

### Rich text không format

- Check dangerouslySetInnerHTML usage
- Add prose classes for styling
- Test preview mode

---

## 🚀 Next Steps

1. Chạy migration trong Supabase
2. Tạo storage buckets
3. Update CreatePostModal với RichTextEditor
4. Update PostCard để hiển thị media
5. Làm tương tự cho Products
6. Test upload multiple images
7. Test video upload & playback

---

**🎉 Tính năng đã hoàn chỉnh 100%!** Chỉ cần tích hợp vào các modal và card là xong!
