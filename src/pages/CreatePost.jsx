import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../api/posts';
import { uploadToCloud } from '../api/uploads';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    caption: '',
    images: [],
    video: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const postData = {
        userId: user._id,
        caption: formData.caption,
        images: formData.images,
        video: formData.video || undefined,
      };

      const data = await createPost(postData);
      if (data.success) {
        navigate('/');
      } else {
        setError(data.message || 'Failed to create post');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    setUploading(true);
    setError('');

    try {
      const uploadPromises = files.map((file) => uploadToCloud(file));

      const results = await Promise.all(uploadPromises);
      
      setFormData((current) => {
        const newImages = [];
        let newVideo = current.video;

        results.forEach((data) => {
          if (data.resourceType === 'video') {
            newVideo = data.url;
          } else {
            newImages.push(data.url);
          }
        });

        return {
          ...current,
          images: [...current.images, ...newImages],
          video: newVideo,
        };
      });

      event.target.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Cloud upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  };

  const removeVideo = () => {
    setFormData((current) => ({
      ...current,
      video: '',
    }));
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] p-5">
      <div className="bg-white rounded-lg p-10 shadow-md w-full max-w-[600px]">
        <h2 className="text-center text-2xl font-bold text-blue-600 mb-8">Create Post</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-5 border border-red-300">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block mb-2 font-medium text-gray-700">Caption</label>
            <textarea
              name="caption"
              value={formData.caption}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded text-base font-inherit resize-y min-h-[100px] focus:outline-none focus:border-blue-600"
              rows="4"
              placeholder="What's on your mind?"
            />
          </div>
          <div className="mb-5">
            <label className="block mb-2 font-medium text-gray-700">Upload Images or Video</label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaUpload}
              className="w-full p-2 border border-gray-300 rounded text-base font-inherit focus:outline-none focus:border-blue-600"
            />
            {uploading && <p className="mt-2 text-gray-600">Uploading...</p>}
          </div>
          
          {formData.images.length > 0 && (
            <div className="mb-5">
              <label className="block mb-2 font-medium text-gray-700">Uploaded Images</label>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 mt-2">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative w-full pb-[100%] rounded-lg overflow-hidden shadow-md">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`} 
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                    <button 
                      type="button" 
                      className="absolute top-1 right-1 bg-red-600/80 text-white border-none rounded-full w-6 h-6 text-base leading-none cursor-pointer flex items-center justify-center hover:bg-red-600 transition-colors"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.video && (
            <div className="mb-5">
              <label className="block mb-2 font-medium text-gray-700">Uploaded Video</label>
              <div className="relative mt-2 rounded-lg overflow-hidden shadow-md">
                <video 
                  src={formData.video} 
                  controls 
                  className="w-full max-h-[400px] block"
                />
                <button 
                  type="button" 
                  className="absolute top-2 right-2 bg-red-600/80 text-white border-none px-4 py-2 rounded text-sm hover:bg-red-600 transition-colors"
                  onClick={removeVideo}
                >
                  Remove Video
                </button>
              </div>
            </div>
          )}
          <button 
            type="submit" 
            className="w-full py-3 text-base font-medium mt-5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
