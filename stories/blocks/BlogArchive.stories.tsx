import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { blogArchiveBlock } from "@/components/puck/podcast/blog-archive";
import { withMockApi } from "../_helpers/mock-api";
import { renderBlock } from "../_helpers/render-block";
import { postsResponse } from "../_helpers/fixtures";
import { allPosts, longPost, paginatedPosts, postsWithImages } from "../_helpers/fixtures-show";

// Block props are an open record: each block validates its own, and the stories omit what they don't vary.
type Args = Record<string, unknown>;

const meta: Meta<Args> = {
  title: "Podcast blocks/Blog Archive",
  render: (args) => <>{renderBlock(blogArchiveBlock, args)}</>,
  decorators: [withMockApi([["/api/posts", paginatedPosts(allPosts)]])],
  parameters: {
    docs: {
      description: {
        component:
          "Blog posts from WordPress through `/api/posts`, as a grid or a list, with a Load more button (no numbered pages: a Puck block has no URL of its own to hold `?page=`). Cards link out to the post on the WordPress host. Handles loading, empty, error and \"not configured\" (501) states.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const WithImages: Story = {
  decorators: [withMockApi([["/api/posts", paginatedPosts(postsWithImages)]])],
};

export const ListLayout: Story = { args: { layout: "list" } };

export const ListWithImages: Story = {
  args: { layout: "list" },
  decorators: [withMockApi([["/api/posts", paginatedPosts(postsWithImages)]])],
};

export const TitlesOnly: Story = { args: { showImages: false, showExcerpts: false } };

/** 6 posts at 3 per page: the Load more button is visible. */
export const LoadMore: Story = {
  args: { postsPerPage: 3 },
};

export const LongContent: Story = {
  decorators: [withMockApi([["/api/posts", paginatedPosts([longPost, ...allPosts])]])],
};

export const NoHeading: Story = { args: { heading: "" } };

export const Loading: Story = {
  decorators: [withMockApi([["/api/posts", () => ({ body: postsResponse, delayMs: 600000 })]])],
};

export const Empty: Story = {
  decorators: [withMockApi([["/api/posts", { posts: [], page: 1, totalPages: 1 }]])],
};

/** 501: the endpoint says the blog backend is switched off, which is not an error. */
export const NotConfigured: Story = {
  decorators: [withMockApi([["/api/posts", () => ({ status: 501, body: { error: "not configured" } })]])],
};

export const ErrorState: Story = {
  decorators: [withMockApi([["/api/posts", () => ({ status: 500, body: { error: "boom" } })]])],
};

/** First page loads, the second fails: the inline retry message appears under the posts. */
export const LoadMoreError: Story = {
  args: { postsPerPage: 3 },
  decorators: [
    withMockApi([
      [
        "/api/posts",
        (url) =>
          url.searchParams.get("page") === "1"
            ? paginatedPosts(allPosts)(url)
            : { status: 500, body: { error: "boom" } },
      ],
    ]),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /load more/i }));
  },
};
