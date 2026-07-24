import { contentService } from "@/features/content";
import type { FeedPost } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useFeed() {
  const postsQ = useQuery({
    queryKey: ["feed-posts"],
    queryFn: () => contentService.getFeedPosts(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const peopleQ = useQuery({
    queryKey: ["feed-people"],
    queryFn: () => contentService.getSuggestedPeople(),
  });

  return {
    posts: postsQ.data ?? [],
    people: peopleQ.data ?? [],
    isLoading: postsQ.isLoading || peopleQ.isLoading,
  };
}

/** Like togglable d'une publication, avec mise à jour optimiste du fil. */
export function useToggleFeedLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => contentService.toggleFeedLike(postId),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ["feed-posts"] });
      const prev = qc.getQueryData<FeedPost[]>(["feed-posts"]);
      qc.setQueryData<FeedPost[]>(["feed-posts"], (posts = []) =>
        posts.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) }
            : p,
        ),
      );
      return { prev };
    },
    onSuccess: (result, postId) => {
      qc.setQueryData<FeedPost[]>(["feed-posts"], (posts = []) =>
        posts.map((p) =>
          p.id === postId ? { ...p, likedByMe: result.liked, likes: result.likes } : p,
        ),
      );
    },
    onError: (_e, _postId, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed-posts"], ctx.prev);
    },
  });
}
