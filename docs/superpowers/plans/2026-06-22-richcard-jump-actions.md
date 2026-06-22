# Richcard Jump Actions

## Goal

Add reusable quick-jump interactions for rich cards and detail pages:

- Matter status cards can open the Matter detail and jump into the channel Matter workspace.
- Summary feedback cards can open the summary detail and jump into the channel summary workspace.
- Detail pages expose a quick way back to the owning workspace when channel context is available.

## Steps

1. Add focused tests for the new card actions.
2. Extend card action types and card builders.
3. Wire business-card action handlers to existing side-panel events.
4. Pass optional target IDs through Chat side-panel endpoints.
5. Add detail-page buttons for Matter and group summary workspace jumps.
6. Run focused tests and a production build check.
