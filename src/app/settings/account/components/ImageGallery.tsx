
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image as ImageIcon, Trash2, Pencil, Save, Ban, Link2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageGalleryProps {
  imageUrls: string[];
  onUrlsChange: (urls: string[]) => void;
}

const convertGoogleDriveUrl = (url: string): string => {
  if (typeof url !== 'string' || !url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }
  return url;
};

export function ImageGallery({ imageUrls, onUrlsChange }: ImageGalleryProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAdd = () => {
    if (imageUrls.length >= 5) {
      toast({ title: "Image Limit Reached", description: "You can add a maximum of 5 images.", variant: 'default' });
      return;
    }
    const newUrls = [...imageUrls, ''];
    onUrlsChange(newUrls);
    setEditingIndex(newUrls.length - 1);
    setInputValue('');
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setInputValue(imageUrls[index]);
  };

  const handleSave = (index: number) => {
    const newUrls = [...imageUrls];
    newUrls[index] = inputValue;
    onUrlsChange(newUrls);
    setEditingIndex(null);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    onUrlsChange(newUrls);
    if (editingIndex === index) {
      setEditingIndex(null);
      setInputValue('');
    }
  };
  
  const handleCancel = (index: number) => {
    if (imageUrls[index] === '') {
        handleRemove(index);
    }
    setEditingIndex(null);
    setInputValue('');
  };


  return (
    <>
      <div className="space-y-3">
        <label className="text-sm font-medium">Images (up to 5)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {imageUrls.map((url, index) => {
            const displayUrl = convertGoogleDriveUrl(url);
            return (
              <div key={`${url}-${index}`} className="relative aspect-video group">
                {editingIndex === index ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 border-2 border-primary rounded-md bg-muted/50">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Paste image URL"
                      className="h-8 text-xs mb-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <div className="flex gap-1.5">
                      <Button type="button" size="icon" className="h-6 w-6" onClick={() => handleSave(index)}><Save className="h-3.5 w-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-muted-foreground" onClick={() => handleCancel(index)}><Ban className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Image
                      src={displayUrl || 'https://placehold.co/400x300.png'}
                      alt={`Image ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover rounded-md border cursor-pointer"
                      onClick={() => displayUrl && setEnlargedImageUrl(displayUrl)}
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300.png'; }}
                    />
                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" size="icon" className="h-6 w-6 bg-black/60 hover:bg-black/80" onClick={() => handleEdit(index)}><Pencil className="h-3.5 w-3.5 text-white" /></Button>
                      <Button type="button" variant="destructive" size="icon" className="h-6 w-6 bg-destructive/80 hover:bg-destructive" onClick={() => handleRemove(index)}><Trash2 className="h-3.5 w-3.5 text-white" /></Button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {imageUrls.length < 5 && (
            <Button type="button" variant="outline" className="h-full aspect-video w-full border-2 border-solid flex flex-col items-center justify-center hover:bg-muted/30" onClick={handleAdd}>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs mt-1 text-muted-foreground">Add Image</span>
            </Button>
          )}
        </div>
      </div>
      {enlargedImageUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 cursor-default"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <Image
            src={enlargedImageUrl}
            alt="Enlarged view"
            width={1200}
            height={800}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-pointer"
          />
        </div>
      )}
    </>
  );
}
