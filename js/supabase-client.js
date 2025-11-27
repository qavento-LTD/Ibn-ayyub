import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Auth Functions ---
export async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName }
        }
    });
    return { data, error };
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// --- Database Functions ---
export async function getProducts(category = null) {
    let query = supabase.from('products').select('*');
    if (category) {
        query = query.eq('category', category);
    }
    const { data, error } = await query;
    return { data, error };
}

export async function getProductById(id) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

export async function addToCart(userId, productId, quantity = 1) {
    // Check if item exists
    const { data: existing } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id)
            .select();
        return { data, error };
    } else {
        const { data, error } = await supabase
            .from('cart_items')
            .insert([{ user_id: userId, product_id: productId, quantity }])
            .select();
        return { data, error };
    }
}

export async function getCartItems(userId) {
    const { data, error } = await supabase
        .from('cart_items')
        .select(`
            id,
            quantity,
            product:products (*)
        `)
        .eq('user_id', userId);
    return { data, error };
}

export async function removeFromCart(itemId) {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
    return { error };
}

export async function updateCartQuantity(itemId, quantity) {
    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);
    return { error };
}

// --- Video Functions ---
export async function getVideos(category = 'all') {
    let query = supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (category !== 'all') {
        query = query.eq('category', category);
    }
    return await query;
}

export async function getVideoById(id) {
    return await supabase.from('videos').select('*').eq('id', id).single();
}

export async function getVideoProducts(videoId) {
    return await supabase
        .from('video_products')
        .select(`
            display_time,
            product:products (*)
        `)
        .eq('video_id', videoId)
        .order('display_time', { ascending: true });
}

export async function getVideoComments(videoId) {
    return await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });
}

export async function addVideoComment(videoId, commentData) {
    const user = await getCurrentUser();
    const payload = {
        video_id: videoId,
        text: commentData.text,
        rating: commentData.rating,
        name: commentData.name,
        email: commentData.email
    };
    if (user) payload.user_id = user.id;

    return await supabase.from('video_comments').insert([payload]);
}

export async function addVideoRating(videoId, rating) {
    // This might be redundant if rating is part of comment, but keeping for compatibility
    return { error: null };
}

export async function toggleVideoLike(videoId) {
    const user = await getCurrentUser();
    if (!user) return { error: { message: 'User not logged in' } };

    // Check if liked
    const { data: existing } = await supabase
        .from('video_likes')
        .select('*')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        // Unlike
        await supabase.from('video_likes').delete().eq('user_id', user.id).eq('video_id', videoId);
        // Decrement count
        await supabase.rpc('decrement_video_likes', { video_id: videoId });
        return { liked: false };
    } else {
        // Like
        await supabase.from('video_likes').insert([{ video_id: videoId, user_id: user.id }]);
        // Increment count
        await supabase.rpc('increment_video_likes', { video_id: videoId });
        return { liked: true };
    }
}
